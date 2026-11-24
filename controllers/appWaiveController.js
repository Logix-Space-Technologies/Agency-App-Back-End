const pool = require("../config/db");
const { openCreditInvoices } = require("../utils/appDues");
const { ensureWaiveTable } = require("../utils/appWaive");
const { logUserActivity } = require("../utils/logUserActivity");
const { getISTTimestamp } = require("../utils/dateUtils");

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const text = (v, max) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);
const fail = (status, message) => Object.assign(new Error(message), { status });
const batchId = () => `W${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

const KIND_LABEL = { shop_dues: "Shop credit", cash_short: "Cash short at settlement", stock_charged: "Stock charged", marketing_credit: "Marketing bill credit", pending: "Total credit pending to office" };

// ---------------------------------------------------------------- what a salesperson owes

// Credit left with shops on the bills this salesperson made, shop by shop.
const shopCredit = async (db, staffId) => {
  const open = await openCreditInvoices(db, staffId ? { staffId } : {});
  const byShop = new Map();
  for (const r of open) {
    const e = byShop.get(r.shop_id) || { shop_id: r.shop_id, owed: 0, invoices: 0, oldest: r.ymd, staff_id: r.staff_id };
    e.owed = money(e.owed + Number(r.owed));
    e.invoices += 1;
    if (r.ymd < e.oldest) e.oldest = r.ymd;
    byShop.set(r.shop_id, e);
  }
  const ids = [...byShop.keys()];
  const info = {};
  if (ids.length) {
    const [shops] = await db.query(
      `SELECT s.shop_id, s.shop_name, r.route_name FROM app_shops s LEFT JOIN app_routes r ON r.route_id = s.route_id WHERE s.shop_id IN (?)`,
      [ids]
    );
    for (const s of shops) info[s.shop_id] = s;
  }
  const shops = [...byShop.values()]
    .map((e) => ({ ...e, shop_name: (info[e.shop_id] || {}).shop_name || `Shop ${e.shop_id}`, route_name: (info[e.shop_id] || {}).route_name || null }))
    .sort((a, b) => b.owed - a.owed);
  return { total: money(shops.reduce((t, s) => t + s.owed, 0)), shops, open };
};

// Unpaid part of a marketing salesperson's settlement bills (sale less expenses, minus what was paid). The day-settlement
// stock charge (DS-) is listed on its own as "stock charged", so it is left out here.
const marketingCredit = async (db, staffId) => {
  const payable = "(fs.TotalAmount - (COALESCE(fs.FuelExpenses, 0) + COALESCE(fs.VehcileServiceExpenses, 0) + COALESCE(fs.OtherExpenses, 0)))";
  const params = [];
  let who = "";
  if (staffId) { who = "AND fs.UserId = ?"; params.push(staffId); }
  const [rows] = await db.query(
    `SELECT fs.sale_tracking_Id AS tracking, fs.invoiceNumber, fs.UserId AS staff_id, DATE_FORMAT(fs.DateofTransaction, '%Y-%m-%d') AS date,
            ${payable} AS payable, fs.AmountPaid
     FROM final_sale fs
     JOIN (SELECT sale_tracking_Id, MIN(sale_type) AS sale_type FROM sales GROUP BY sale_tracking_Id) s
       ON fs.sale_tracking_Id = s.sale_tracking_Id AND s.sale_type = 'marketing'
     WHERE fs.isActive = 1 AND fs.invoiceNumber NOT LIKE 'DS-%' ${who} AND ${payable} - fs.AmountPaid > 0.004`,
    params
  );
  if (!rows.length) return [];
  const [w] = await db.query(
    "SELECT tracking, SUM(amount) AS amt FROM app_waive_offs WHERE kind = 'marketing_credit' AND reversed = 0 AND tracking IN (?) GROUP BY tracking",
    [rows.map((r) => r.tracking)]
  );
  const waived = {};
  for (const r of w) waived[r.tracking] = money(r.amt);
  return rows.map((r) => ({
    kind: "marketing_credit", settlement_id: null, staff_id: r.staff_id, date: r.date, amount: money(r.payable), tracking: r.tracking,
    invoice_no: r.invoiceNumber, waived: waived[r.tracking] || 0, owed: money(Number(r.payable) - Number(r.AmountPaid)), label: KIND_LABEL.marketing_credit,
  }));
};

// What day settlements left unpaid by the salesperson: cash not handed over, and stock charged to him.
// Read from the saved settlement (undone days do not count), less what the office waived or was paid since.
const shortages = async (db, staffId) => {
  await ensureWaiveTable();
  const params = [];
  let where = `details IS NOT NULL AND (details LIKE '%"difference":-%' OR details NOT LIKE '%"extra_charge":0,%')`;
  if (staffId) { where = `staff_id = ? AND ${where}`; params.push(staffId); }
  const [rows] = await db.query(
    `SELECT settlement_id, staff_id, DATE_FORMAT(settle_date, '%Y-%m-%d') AS settle_date, details FROM app_day_settlements WHERE ${where} ORDER BY settlement_id`,
    params
  );
  const found = [];
  for (const row of rows) {
    let det = null;
    try { det = typeof row.details === "string" ? JSON.parse(row.details) : row.details; } catch (e) { det = null; }
    if (!det || det.undone || !det.handover) continue;
    const h = det.handover;
    const short = money(-Number(h.difference || 0));
    // Money the office already took from the salesperson against this shortage in View Credit (Pay Now).
    const paidLater = money((det.credit_payments || []).reduce((t, p) => t + Number(p.total || 0), 0));
    if (short > 0.004) found.push({ kind: "cash_short", settlement_id: row.settlement_id, staff_id: row.staff_id, date: row.settle_date, amount: short, paid_later: paidLater, tracking: null });
    const extra = money(h.extra_charge);
    const tracking = det.undo && det.undo.ds_tracking;
    if (extra > 0.004 && tracking) found.push({ kind: "stock_charged", settlement_id: row.settlement_id, staff_id: row.staff_id, date: row.settle_date, amount: extra, tracking });
  }
  const ids = [...new Set(found.map((f) => f.settlement_id))];
  const waived = {};
  if (ids.length) {
    const [w] = await db.query(
      "SELECT settlement_id, kind, SUM(amount) AS amt FROM app_waive_offs WHERE kind IN ('cash_short','stock_charged') AND reversed = 0 AND settlement_id IN (?) GROUP BY settlement_id, kind",
      [ids]
    );
    for (const r of w) waived[`${r.kind}:${r.settlement_id}`] = money(r.amt);
  }
  const trackings = found.filter((f) => f.tracking).map((f) => f.tracking);
  const sales = {};
  if (trackings.length) {
    const [fs] = await db.query("SELECT sale_tracking_Id, TotalAmount, AmountPaid, isActive FROM final_sale WHERE sale_tracking_Id IN (?)", [trackings]);
    for (const f of fs) sales[String(f.sale_tracking_Id)] = f;
  }
  const items = found.map((f) => {
    const waivedAmt = waived[`${f.kind}:${f.settlement_id}`] || 0;
    let owed;
    if (f.kind === "cash_short") owed = Math.max(0, money(f.amount - waivedAmt - f.paid_later));
    else {
      const sale = sales[String(f.tracking)];
      owed = sale && Number(sale.isActive) === 1 ? Math.max(0, money(Number(sale.TotalAmount) - Number(sale.AmountPaid))) : 0;
    }
    return { ...f, waived: waivedAmt, owed, label: KIND_LABEL[f.kind] };
  });
  return [...items, ...(await marketingCredit(db, staffId))];
};

const staffNames = async (db, ids) => {
  if (!ids.length) return {};
  const [rows] = await db.query("SELECT user_id, name FROM users WHERE user_id IN (?)", [ids]);
  const m = {};
  for (const r of rows) m[r.user_id] = r.name;
  return m;
};

// One line per admin action: the rows that share a batch are one waive-off.
const historyRows = async (db, { staffId = null, kind = null, from = null, to = null, limit = 300 } = {}) => {
  await ensureWaiveTable();
  const where = ["1 = 1"];
  const params = [];
  if (staffId) { where.push("w.staff_id = ?"); params.push(staffId); }
  if (kind) { where.push("w.kind = ?"); params.push(kind); }
  if (from) { where.push("w.created_at >= ?"); params.push(`${from} 00:00:00`); }
  if (to) { where.push("w.created_at <= ?"); params.push(`${to} 23:59:59`); }
  const [rows] = await db.query(
    `SELECT w.*, DATE_FORMAT(w.created_at, '%Y-%m-%d %H:%i:%s') AS created_text, DATE_FORMAT(w.reversed_at, '%Y-%m-%d %H:%i:%s') AS reversed_text,
            u.name AS staff_name, a.name AS admin_name, ra.name AS reversed_name, sh.shop_name, i.invoice_no,
            DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date, DATE_FORMAT(s.settle_date, '%Y-%m-%d') AS settle_date,
            f.invoiceNumber AS marketing_invoice, DATE_FORMAT(f.DateofTransaction, '%Y-%m-%d') AS marketing_date
     FROM app_waive_offs w
     LEFT JOIN users u ON u.user_id = w.staff_id
     LEFT JOIN users a ON a.user_id = w.created_by
     LEFT JOIN users ra ON ra.user_id = w.reversed_by
     LEFT JOIN app_shops sh ON sh.shop_id = w.shop_id
     LEFT JOIN app_invoices i ON i.app_invoice_id = w.invoice_id
     LEFT JOIN app_day_settlements s ON s.settlement_id = w.settlement_id
     LEFT JOIN final_sale f ON w.tracking IS NOT NULL AND f.sale_tracking_Id = w.tracking COLLATE utf8mb4_general_ci
     WHERE ${where.join(" AND ")} ORDER BY w.waive_id DESC LIMIT 2000`,
    params
  );
  const batches = new Map();
  for (const r of rows) {
    let b = batches.get(r.batch_id);
    if (!b) {
      b = {
        batch_id: r.batch_id, kind: r.kind, label: KIND_LABEL[r.kind] || r.kind, staff_id: r.staff_id, staff_name: r.staff_name,
        shop_name: r.shop_name || null, reason: r.reason, created_by: r.admin_name || "Admin", created_at: r.created_text,
        amount: 0, reversed: true, reversed_at: r.reversed_text, reversed_by: r.reversed_name || null, reverse_reason: r.reverse_reason, lines: [],
      };
      batches.set(r.batch_id, b);
    }
    b.amount = money(b.amount + Number(r.amount));
    if (r.kind !== b.kind && b.kind !== "pending") { b.kind = "pending"; b.label = KIND_LABEL.pending; }
    if (!r.reversed) b.reversed = false;
    b.lines.push({
      invoice_no: r.invoice_no || r.marketing_invoice || null, invoice_date: r.invoice_date || r.marketing_date || null, settlement_id: r.settlement_id || null,
      settle_date: r.settle_date || null, amount: money(r.amount),
    });
  }
  return [...batches.values()].slice(0, limit);
};

// ---------------------------------------------------------------- the phone

exports.myCredits = async (req, res) => {
  try {
    const staffId = req.staff.user_id;
    const [short, history] = await Promise.all([shortages(pool, staffId), historyRows(pool, { staffId, limit: 60 })]);
    const items = short.filter((s) => s.owed > 0.004);
    const shortTotal = money(items.reduce((t, s) => t + s.owed, 0));
    // Shop credit is a separate thing (the dues screen); this is only what the salesperson owes the office.
    const waivedHistory = history.filter((h) => !h.reversed && h.kind !== "shop_dues").map((h) => ({
      batch_id: h.batch_id, label: h.label, shop_name: h.shop_name, amount: h.amount, reason: h.reason, created_at: h.created_at, created_by: h.created_by,
    }));
    res.json({
      total: shortTotal,
      short: { total: shortTotal, items: items.map((s) => ({ kind: s.kind, label: s.label, settlement_id: s.settlement_id, invoice_no: s.invoice_no || null, date: s.date, amount: s.amount, waived: s.waived, owed: s.owed })) },
      waived: { total: money(waivedHistory.reduce((t, h) => t + h.amount, 0)), items: waivedHistory },
    });
  } catch (error) {
    console.error("myCredits error:", error);
    res.status(500).json({ message: "Could not load your credits" });
  }
};

// ---------------------------------------------------------------- the office

// Every salesperson who owes something.
exports.overview = async (req, res) => {
  try {
    const [shop, short] = await Promise.all([shopCredit(pool, null), shortages(pool, null)]);
    const rows = new Map();
    const row = (id) => {
      if (!rows.has(id)) rows.set(id, { staff_id: id, shop_credit: 0, cash_short: 0, stock_charged: 0, marketing_credit: 0 });
      return rows.get(id);
    };
    for (const r of shop.open) row(r.staff_id).shop_credit = money(row(r.staff_id).shop_credit + Number(r.owed));
    for (const s of short) if (s.owed > 0.004) row(s.staff_id)[s.kind] = money(row(s.staff_id)[s.kind] + s.owed);
    const names = await staffNames(pool, [...rows.keys()]);
    const staff = [...rows.values()]
      .map((r) => ({ ...r, name: names[r.staff_id] || `Staff ${r.staff_id}`, pending: money(r.cash_short + r.stock_charged + r.marketing_credit), total: money(r.shop_credit + r.cash_short + r.stock_charged + r.marketing_credit) }))
      .filter((r) => r.total > 0.004)
      .sort((a, b) => b.total - a.total);
    const [[{ n }]] = await pool.query("SELECT COUNT(DISTINCT batch_id) AS n FROM app_waive_offs WHERE reversed = 0");
    res.json({
      staff,
      totals: {
        shop_credit: money(staff.reduce((t, r) => t + r.shop_credit, 0)), cash_short: money(staff.reduce((t, r) => t + r.cash_short, 0)),
        stock_charged: money(staff.reduce((t, r) => t + r.stock_charged, 0)), marketing_credit: money(staff.reduce((t, r) => t + r.marketing_credit, 0)), pending: money(staff.reduce((t, r) => t + r.pending, 0)), total: money(staff.reduce((t, r) => t + r.total, 0)),
      },
      waive_offs: Number(n),
    });
  } catch (error) {
    console.error("waive overview error:", error);
    res.status(500).json({ message: "Could not load the credits" });
  }
};

exports.staffCredits = async (req, res) => {
  try {
    const staffId = Number(req.body.staff_id);
    if (!staffId) return res.status(400).json({ message: "Choose a salesperson" });
    const [shop, short, history, names] = await Promise.all([
      shopCredit(pool, staffId), shortages(pool, staffId), historyRows(pool, { staffId, limit: 100 }), staffNames(pool, [staffId]),
    ]);
    const items = short.filter((s) => s.owed > 0.004);
    res.json({
      staff: { staff_id: staffId, name: names[staffId] || `Staff ${staffId}` },
      shop_credit: { total: shop.total, shops: shop.shops.map(({ staff_id, ...s }) => s) },
      short: { total: money(items.reduce((t, s) => t + s.owed, 0)), items },
      history,
    });
  } catch (error) {
    console.error("waive staffCredits error:", error);
    res.status(500).json({ message: "Could not load this salesperson's credits" });
  }
};

exports.history = async (req, res) => {
  try {
    const { staff_id, kind, from, to } = req.body || {};
    const batches = await historyRows(pool, { staffId: Number(staff_id) || null, kind: kind || null, from: from || null, to: to || null });
    res.json({ history: batches, total: money(batches.filter((b) => !b.reversed).reduce((t, b) => t + b.amount, 0)) });
  } catch (error) {
    console.error("waive history error:", error);
    res.status(500).json({ message: "Could not load the waive-off history" });
  }
};

// final_sale of a booked bill (or of a day's charged stock): the waived part counts as paid, with no payment history,
// so the cash and UPI reports stay true. isSettled is set first: MySQL reads the assignments left to right.
const markPaid = (conn, tracking, amount) =>
  conn.query(
    `UPDATE final_sale SET isSettled = IF(AmountPaid + ? >= TotalAmount - 0.005, 1, isSettled), AmountPaid = AmountPaid + ?
     WHERE sale_tracking_Id = ? AND isActive = 1`,
    [amount, amount, tracking]
  );
const markUnpaid = (conn, tracking, amount) =>
  conn.query(
    `UPDATE final_sale SET isSettled = IF(AmountPaid - ? >= TotalAmount - 0.005, isSettled, 0), AmountPaid = GREATEST(0, AmountPaid - ?)
     WHERE sale_tracking_Id = ? AND isActive = 1`,
    [amount, amount, tracking]
  );

exports.waive = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensureWaiveTable();
    const kind = String(req.body.kind || "");
    const adminId = req.body.userId || null;
    const reason = text(req.body.reason, 300);
    if (!KIND_LABEL[kind]) throw fail(400, "Choose what to waive off");
    if (!reason || reason.length < 3) throw fail(400, "Write the reason for the waive-off");
    const wantAll = req.body.full === true;
    const asked = money(req.body.amount);
    if (!wantAll && !(asked > 0)) throw fail(400, "Enter the amount to waive off");

    await connection.beginTransaction();
    const now = getISTTimestamp();
    const batch = batchId();
    let total = 0;
    let staffId = null;
    let summary = "";

    if (kind === "shop_dues") {
      const shopId = Number(req.body.shop_id);
      if (!shopId) throw fail(400, "Choose a shop");
      const onlyStaff = Number(req.body.staff_id) || null;
      await connection.query("SELECT app_invoice_id FROM app_invoices WHERE shop_id = ? FOR UPDATE", [shopId]);
      const open = (await openCreditInvoices(connection, { shopIds: [shopId], staffId: onlyStaff }))
        .sort((a, b) => (a.ymd < b.ymd ? -1 : a.ymd > b.ymd ? 1 : a.app_invoice_id - b.app_invoice_id));
      const owed = money(open.reduce((t, o) => t + Number(o.owed), 0));
      if (owed <= 0.004) throw fail(400, "This shop has no credit left to waive off");
      const amount = wantAll ? owed : asked;
      if (amount > owed + 0.005) throw fail(400, `Only Rs. ${owed.toFixed(2)} is left to waive off here`);
      let left = amount;
      for (const inv of open) {
        if (left <= 0.004) break;
        const take = money(Math.min(Number(inv.owed), left));
        if (take <= 0) continue;
        left = money(left - take);
        await connection.query(
          `INSERT INTO app_waive_offs (batch_id, kind, staff_id, shop_id, invoice_id, amount, reason, created_by, created_at)
           VALUES (?, 'shop_dues', ?, ?, ?, ?, ?, ?, ?)`,
          [batch, inv.staff_id, shopId, inv.app_invoice_id, take, reason, adminId, now]
        );
        // A bill already booked in the office system shows the waived part as paid there too.
        if (inv.status === "settled" && inv.final_sale_tracking_id) await markPaid(connection, inv.final_sale_tracking_id, take);
        staffId = staffId || inv.staff_id;
      }
      total = amount;
      const [[sh]] = await connection.query("SELECT shop_name FROM app_shops WHERE shop_id = ?", [shopId]);
      summary = `Rs. ${amount} of shop credit at ${sh ? sh.shop_name : shopId}`;
    } else if (kind === "marketing_credit") {
      const tracking = String(req.body.tracking || "");
      if (!tracking) throw fail(400, "Choose the bill");
      const [[fs]] = await connection.query(
        `SELECT UserId, invoiceNumber, (TotalAmount - (COALESCE(FuelExpenses, 0) + COALESCE(VehcileServiceExpenses, 0) + COALESCE(OtherExpenses, 0))) - AmountPaid AS owed
         FROM final_sale WHERE sale_tracking_Id = ? AND isActive = 1 FOR UPDATE`,
        [tracking]
      );
      if (!fs) throw fail(404, "Bill not found");
      const owed = money(fs.owed);
      if (owed <= 0.004) throw fail(400, "Nothing is left to waive off here");
      const amount = wantAll ? owed : asked;
      if (amount > owed + 0.005) throw fail(400, `Only Rs. ${owed.toFixed(2)} is left to waive off here`);
      await connection.query(
        `INSERT INTO app_waive_offs (batch_id, kind, staff_id, tracking, amount, reason, created_by, created_at)
         VALUES (?, 'marketing_credit', ?, ?, ?, ?, ?, ?)`,
        [batch, fs.UserId, tracking, amount, reason, adminId, now]
      );
      await markPaid(connection, tracking, amount);
      staffId = fs.UserId;
      total = amount;
      summary = `Rs. ${amount} of marketing bill ${fs.invoiceNumber}`;
    } else if (kind === "pending") {
      // Waive off part or all of a salesperson's total credit pending to the office: oldest day first, cash short
      // before stock charged. Credit left with shops is separate and not touched.
      const sid = Number(req.body.staff_id);
      if (!sid) throw fail(400, "Choose a salesperson");
      await connection.query("SELECT settlement_id FROM app_day_settlements WHERE staff_id = ? FOR UPDATE", [sid]);
      const items = (await shortages(connection, sid)).filter((x) => x.owed > 0.004)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (a.kind === "cash_short" ? -1 : 0));
      const owed = money(items.reduce((t, x) => t + x.owed, 0));
      if (owed <= 0.004) throw fail(400, "Nothing is pending to the office");
      const amount = wantAll ? owed : asked;
      if (amount > owed + 0.005) throw fail(400, `Only Rs. ${owed.toFixed(2)} is pending`);
      let left = amount;
      for (const it of items) {
        if (left <= 0.004) break;
        const take = money(Math.min(it.owed, left));
        left = money(left - take);
        await connection.query(
          `INSERT INTO app_waive_offs (batch_id, kind, staff_id, settlement_id, tracking, amount, reason, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [batch, it.kind, sid, it.settlement_id, it.tracking || null, take, reason, adminId, now]
        );
        if (it.kind === "stock_charged" || it.kind === "marketing_credit") await markPaid(connection, it.tracking, take);
      }
      staffId = sid;
      total = amount;
      summary = `Rs. ${amount} of the total credit pending to the office`;
    } else {
      const settlementId = Number(req.body.settlement_id);
      if (!settlementId) throw fail(400, "Choose the settlement");
      await connection.query("SELECT settlement_id FROM app_day_settlements WHERE settlement_id = ? FOR UPDATE", [settlementId]);
      const [[row]] = await connection.query("SELECT staff_id FROM app_day_settlements WHERE settlement_id = ?", [settlementId]);
      if (!row) throw fail(404, "Settlement not found");
      const item = (await shortages(connection, row.staff_id)).find((s) => s.settlement_id === settlementId && s.kind === kind);
      if (!item || item.owed <= 0.004) throw fail(400, "Nothing is left to waive off here");
      const amount = wantAll ? item.owed : asked;
      if (amount > item.owed + 0.005) throw fail(400, `Only Rs. ${item.owed.toFixed(2)} is left to waive off here`);
      await connection.query(
        `INSERT INTO app_waive_offs (batch_id, kind, staff_id, settlement_id, tracking, amount, reason, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [batch, kind, row.staff_id, settlementId, kind === "stock_charged" ? item.tracking : null, amount, reason, adminId, now]
      );
      if (kind === "stock_charged") await markPaid(connection, item.tracking, amount);
      staffId = row.staff_id;
      total = amount;
      summary = `Rs. ${amount} ${kind === "cash_short" ? "cash short" : "stock charged"} of settlement ${settlementId}`;
    }

    await connection.commit();
    await logUserActivity({ req, user_id: adminId, action: `Waived off ${summary} (${reason})`, reference_type: "app_waive_off", reference_id: staffId });
    res.json({ message: `Rs. ${total} waived off`, batch_id: batch, amount: total });
  } catch (error) {
    try { await connection.rollback(); } catch (e) { /* nothing to undo */ }
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("waive error:", error);
    res.status(500).json({ message: "Could not waive it off" });
  } finally {
    connection.release();
  }
};

// Puts a waive-off back: the credit is owed again. The record stays, marked as reversed.
exports.reverse = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensureWaiveTable();
    const adminId = req.body.userId || null;
    const reason = text(req.body.reason, 300);
    if (!reason) throw fail(400, "Write why the waive-off is being reversed");
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT * FROM app_waive_offs WHERE batch_id = ? AND reversed = 0 FOR UPDATE", [String(req.body.batch_id || "")]);
    if (!rows.length) throw fail(400, "This waive-off is already reversed or does not exist");
    const now = getISTTimestamp();
    let total = 0;
    for (const r of rows) {
      total = money(total + Number(r.amount));
      await connection.query(
        "UPDATE app_waive_offs SET reversed = 1, reversed_by = ?, reversed_at = ?, reverse_reason = ? WHERE waive_id = ?",
        [adminId, now, reason, r.waive_id]
      );
      if (r.kind === "shop_dues") {
        const [[inv]] = await connection.query("SELECT status, final_sale_tracking_id FROM app_invoices WHERE app_invoice_id = ?", [r.invoice_id]);
        if (inv && inv.status === "settled" && inv.final_sale_tracking_id) await markUnpaid(connection, inv.final_sale_tracking_id, Number(r.amount));
      } else if (r.kind === "marketing_credit") {
        if (r.tracking) await markUnpaid(connection, r.tracking, Number(r.amount));
      } else if (r.kind === "stock_charged") {
        const [[s]] = await connection.query("SELECT details FROM app_day_settlements WHERE settlement_id = ?", [r.settlement_id]);
        let det = null;
        try { det = s && s.details ? (typeof s.details === "string" ? JSON.parse(s.details) : s.details) : null; } catch (e) { det = null; }
        const tracking = det && det.undo && det.undo.ds_tracking;
        if (tracking) await markUnpaid(connection, tracking, Number(r.amount));
      }
    }
    await connection.commit();
    await logUserActivity({ req, user_id: adminId, action: `Reversed waive-off ${req.body.batch_id} of Rs. ${total} (${reason})`, reference_type: "app_waive_off", reference_id: rows[0].staff_id });
    res.json({ message: `Rs. ${total} is owed again` });
  } catch (error) {
    try { await connection.rollback(); } catch (e) { /* nothing to undo */ }
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("waive reverse error:", error);
    res.status(500).json({ message: "Could not reverse the waive-off" });
  } finally {
    connection.release();
  }
};

exports.shortages = shortages;
exports.shopCredit = shopCredit;
