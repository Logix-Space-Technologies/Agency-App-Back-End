const pool = require("../config/db");
const { logUserActivity } = require("../utils/logUserActivity");
const { getISTTimestamp, getISTDate } = require("../utils/dateUtils");
const { postInvoiceTx, trackingId } = require("../utils/appSettle");
const { dayInfo } = require("./appDayController");

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const int = (v) => Math.max(0, Math.floor(Number(v) || 0));
const fail = (status, message) => Object.assign(new Error(message), { status });

// Everything the office needs to check one salesperson's day: the invoices still waiting, what was
// allocated to them, and what the phone says was sold, product by product.
const loadDay = async (db, staffId, date, lock = false) => {
  const suffix = lock ? " FOR UPDATE" : "";
  const [invoices] = await db.query(
    `SELECT i.app_invoice_id, i.invoice_no, s.shop_name, i.total_amount, i.cash_amount, i.upi_amount, i.card_amount,
            i.credit_amount, i.price_flag, DATE_FORMAT(i.created_at, '%H:%i') AS created_time
     FROM app_invoices i JOIN app_shops s ON s.shop_id = i.shop_id
     WHERE i.staff_id = ? AND i.invoice_date = ? AND i.status = 'pending'
     ORDER BY i.app_invoice_id${suffix}`,
    [staffId, date]
  );
  const [sold] = await db.query(
    `SELECT it.product_id, SUM(it.quantity) AS sold, SUM(it.line_total) AS amount
     FROM app_invoice_items it JOIN app_invoices i ON i.app_invoice_id = it.app_invoice_id
     WHERE i.staff_id = ? AND i.invoice_date = ? AND i.status = 'pending'
     GROUP BY it.product_id`,
    [staffId, date]
  );
  const [allocs] = await db.query(
    `SELECT daily_stock_id, product_id, allocated_quantity, DATE_FORMAT(date, '%Y-%m-%d') AS alloc_date
     FROM daily_stock_allocation
     WHERE marketing_staff_id = ? AND converted_to_sales = 0 AND isActive = 1 AND allocated_quantity > 0 AND date <= ?
     ORDER BY date, daily_stock_id${suffix}`,
    [staffId, date]
  );
  const [[{ older }]] = await db.query(
    "SELECT COUNT(*) AS older FROM app_invoices WHERE staff_id = ? AND invoice_date < ? AND status = 'pending'",
    [staffId, date]
  );

  const byProduct = new Map();
  const row = (id) => {
    if (!byProduct.has(id)) byProduct.set(id, { product_id: id, allocated: 0, sold: 0, amount: 0, alloc_rows: [] });
    return byProduct.get(id);
  };
  for (const a of allocs) {
    const r = row(a.product_id);
    r.allocated += Number(a.allocated_quantity);
    r.alloc_rows.push({ daily_stock_id: a.daily_stock_id, allocated_quantity: Number(a.allocated_quantity), date: a.alloc_date });
  }
  for (const s of sold) {
    const r = row(s.product_id);
    r.sold = Number(s.sold);
    r.amount = money(s.amount);
  }
  const ids = [...byProduct.keys()];
  const names = new Map();
  if (ids.length) {
    const [p] = await db.query("SELECT product_id, product_name FROM products WHERE product_id IN (?)", [ids]);
    p.forEach((x) => names.set(x.product_id, x.product_name));
  }
  const products = [...byProduct.values()]
    .map((r) => ({
      ...r,
      product_name: names.get(r.product_id) || `Product ${r.product_id}`,
      avg_price: r.sold > 0 ? money(r.amount / r.sold) : 0,
      expected_balance: Math.max(0, r.allocated - r.sold),
      over_sold: r.sold > r.allocated,
      not_allocated: r.allocated === 0 && r.sold > 0,
    }))
    .sort((a, b) => a.product_name.localeCompare(b.product_name));

  const sum = (key) => money(invoices.reduce((t, i) => t + Number(i[key]), 0));
  return {
    invoices, products, olderPending: older,
    totals: { total: sum("total_amount"), cash: sum("cash_amount"), upi: sum("upi_amount"), card: sum("card_amount"), credit: sum("credit_amount") },
  };
};

exports.loadDay = loadDay;

// What the salesperson should hand over for the day: payments taken on their invoices plus any old dues
// they collected that day (with a bill or on their own), by method.
const expectedHandover = async (db, staffId, date, totals) => {
  // A second settlement on the same day only counts what came in after the first one, so nothing is counted twice.
  const [[last]] = await db.query(
    `SELECT DATE_FORMAT(MAX(settled_at), '%Y-%m-%d %H:%i:%s') AS at
     FROM app_day_settlements WHERE staff_id = ? AND settle_date = ? AND invoice_count > 0`,
    [staffId, date]
  );
  const [[d]] = await db.query(
    `SELECT COALESCE(SUM(cash_amount), 0) AS cash, COALESCE(SUM(upi_amount), 0) AS upi, COALESCE(SUM(card_amount), 0) AS card
     FROM app_payments WHERE staff_id = ? AND DATE(created_at) = ? ${last && last.at ? "AND created_at > ?" : ""}`,
    last && last.at ? [staffId, date, last.at] : [staffId, date]
  );
  const cash = money(totals.cash + Number(d.cash));
  const upi = money(totals.upi + Number(d.upi));
  const card = money(totals.card + Number(d.card));
  return { cash, upi, card, total: money(cash + upi + card), dues_cash: Number(d.cash), dues_upi: Number(d.upi), dues_card: Number(d.card) };
};
exports.expectedHandover = expectedHandover;

// Damage the salesperson reported from the phone for this day: { product_id: qty }.
const reportedDamage = async (db, staffId, date) => {
  const [rows] = await db.query(
    "SELECT product_id, damaged_qty FROM app_damage_reports WHERE staff_id = ? AND report_date = ?",
    [staffId, date]
  );
  const map = {};
  rows.forEach((r) => { map[r.product_id] = Number(r.damaged_qty); });
  return map;
};
exports.reportedDamage = reportedDamage;

exports.previewDay = async (req, res) => {
  try {
    const staffId = Number(req.body.staff_id);
    const date = req.body.date;
    if (!staffId || !isDate(date)) return res.status(400).json({ message: "Choose a salesperson and a date" });
    const [staff] = await pool.query("SELECT user_id, name FROM users WHERE user_id = ?", [staffId]);
    if (!staff[0]) return res.status(404).json({ message: "Salesperson not found" });
    const day = await loadDay(pool, staffId, date);
    const reported = await reportedDamage(pool, staffId, date);
    day.products = day.products.map((p) => ({ ...p, reported_damage: reported[p.product_id] || 0 }));
    const handover = await expectedHandover(pool, staffId, date, day.totals);
    const info = await dayInfo(pool, staffId, date);
    // Fuel already counted in an earlier settlement of the same day is not offered again.
    info.fuel = info.fuel.filter((f) => !f.settlement_id);
    info.fuel_total = money(info.fuel.reduce((t, f) => t + f.amount, 0));
    res.json({ staff: staff[0], date, ...day, handover, vehicle: info });
  } catch (error) {
    console.error("previewDay error:", error);
    res.status(500).json({ message: "Could not load the day" });
  }
};

exports.settleDay = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const staffId = Number(req.body.staff_id);
    const date = req.body.date;
    const adminId = req.body.userId || null;
    const entered = new Map((Array.isArray(req.body.items) ? req.body.items : []).map((i) => [Number(i.product_id), i]));
    if (!staffId || !isDate(date)) throw fail(400, "Choose a salesperson and a date");

    await connection.beginTransaction();
    const day = await loadDay(connection, staffId, date, true);
    if (day.invoices.length === 0) throw fail(400, "There are no pending invoices for this day");

    // The office can look at the day any time, but settles it only after the salesperson asks from the app.
    const [[req0]] = await connection.query(
      "SELECT DATE_FORMAT(settle_requested_at, '%Y-%m-%d %H:%i:%s') AS settle_requested_at FROM app_day_info WHERE staff_id = ? AND info_date = ? FOR UPDATE",
      [staffId, date]
    ).then(([rows]) => [[rows[0] || {}]]);
    if (!req0.settle_requested_at) {
      throw fail(400, "This day cannot be settled yet. The salesperson has to tap Request settlement in the app and enter the closing KM first.");
    }

    // Stock must be allocated before it is sold: the office adds the missing allocation first.
    const short = day.products.filter((p) => p.sold > p.allocated);
    if (short.length) {
      throw fail(
        400,
        `Allocate the missing stock first, then settle: ${short
          .map((p) => `${p.product_name} (allocated ${p.allocated}, sold ${p.sold}, ${p.sold - p.allocated} more needed)`)
          .join("; ")}. Add the allocation for this salesperson and date, then load the day again.`
      );
    }

    // Balance and damage come from the office; loss is whatever is left of the allocation.
    // What the salesperson collected, less the expenses they paid, is what they should hand over.
    const expected = await expectedHandover(connection, staffId, date, day.totals);
    const exp = req.body.expenses || {};
    const expenses = { fuel: money(exp.fuel), vehicle_service: money(exp.vehicle_service), other: money(exp.other) };
    for (const k of Object.keys(expenses)) {
      if (!Number.isFinite(expenses[k]) || expenses[k] < 0) throw fail(400, "Expenses must be zero or more");
    }
    expenses.total = money(expenses.fuel + expenses.vehicle_service + expenses.other);
    const netPayable = money(expected.total - expenses.total);

    // Payment breakdown: starts as the same cash, UPI and card they collected (cash is reduced by the expenses).
    const got = req.body.received || {};
    const pick = (v, fallback) => (v === undefined || v === null || v === "" ? fallback : Number(v));
    const received = {
      cash: pick(got.cash, Math.max(0, money(expected.cash - expenses.total))),
      upi: pick(got.upi, expected.upi),
      card: pick(got.card, expected.card),
    };
    for (const k of ["cash", "upi", "card"]) {
      if (!Number.isFinite(received[k]) || received[k] < 0) throw fail(400, "The received amounts must be zero or more");
      received[k] = money(received[k]);
    }
    received.total = money(received.cash + received.upi + received.card);
    const handover = { expected, expenses, net_payable: netPayable, received, difference: money(received.total - netPayable) };
    const reported = await reportedDamage(connection, staffId, date);
    const lines = day.products.map((p) => {
      const gap = p.allocated - p.sold; // what should be left with the salesperson
      const input = entered.get(p.product_id) || {};
      let damaged = int(input.damaged);
      let balance = input.balance === undefined || input.balance === "" ? Math.max(0, gap - damaged) : int(input.balance);
      let loss = 0;
      if (gap <= 0) {
        balance = 0; damaged = 0; // nothing left to return; any shortage is already in the sold column
      } else {
        loss = gap - balance - damaged;
        if (loss < 0) throw fail(400, `${p.product_name}: balance (${balance}) and damaged (${damaged}) are more than what is left (${gap})`);
      }
      return { ...p, balance, damaged, loss };
    });

    const vehicle = await dayInfo(connection, staffId, date);
    const openFuel = vehicle.fuel.filter((f) => !f.settlement_id);

    const now = getISTTimestamp();
    const [settle] = await connection.query(
      `INSERT INTO app_day_settlements (staff_id, settle_date, settled_by, settled_at, invoice_count, total_amount,
                                        cash_amount, upi_amount, card_amount, credit_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [staffId, date, adminId, now, day.invoices.length, day.totals.total, day.totals.cash, day.totals.upi, day.totals.card, day.totals.credit]
    );
    const settlementId = settle.insertId;
    // The request is used up; a later sale on the same day needs a new one.
    await connection.query("UPDATE app_day_info SET settle_requested_at = NULL WHERE staff_id = ? AND info_date = ?", [staffId, date]);
    // The fuel bills from the phone belong to this settlement now (Undo frees them again).
    await connection.query(
      "UPDATE app_fuel_entries SET settlement_id = ? WHERE staff_id = ? AND fuel_date = ? AND settlement_id IS NULL",
      [settlementId, staffId, date]
    );

    // 1. Post every invoice of the day to the books (sale, payments, stock for what was sold).
    const posted = [];
    for (const inv of day.invoices) {
      const r = await postInvoiceTx(connection, inv.app_invoice_id, adminId, { checkAllocation: false });
      posted.push({ invoice_id: inv.app_invoice_id, tracking_id: r.tracking, invoice_no: inv.invoice_no, books_no: r.invoiceNumber, shop_name: inv.shop_name,
        total: Number(inv.total_amount), cash: Number(inv.cash_amount), upi: Number(inv.upi_amount),
        card: Number(inv.card_amount), credit: Number(inv.credit_amount) });
    }

    // Expenses the salesperson paid go in as ordinary expense vouchers, so Cash Flow and the Cash Report see them.
    const categoryFor = async (kind, label) => {
      const [found] = await connection.query(
        "SELECT expense_category_id FROM expense_categories WHERE expense_category_name LIKE ? ORDER BY expense_category_id LIMIT 1",
        [`%${kind}%`]
      );
      if (found[0]) return found[0].expense_category_id;
      const [created] = await connection.query("INSERT INTO expense_categories (expense_category_name) VALUES (?)", [label]);
      return created.insertId;
    };
    const voucherIds = [];
    for (const [key, kind, label] of [["fuel", "fuel", "Fuel"], ["vehicle_service", "vehicle", "Vehicle Service"], ["other", "other", "Other Expenses"]]) {
      if (expenses[key] > 0) {
        const categoryId = await categoryFor(kind, label);
        const [voucher] = await connection.query(
          `INSERT INTO misc_expense_vouchers (expense_category_id, description, amount, gst_amount, expense_date, payment_method, addedBy, created, isActive)
           VALUES (?, ?, ?, 0, ?, 'cash', ?, ?, 1)`,
          [categoryId, `${label} - day settlement ${settlementId} (${staffId})`, expenses[key], date, adminId, now]
        );
        voucherIds.push(voucher.insertId);
      }
    }

    // 2. Damaged and lost stock, the same way the marketing settlement records it.
    const withShortage = lines.filter((l) => l.damaged > 0 || l.loss > 0);
    for (const l of withShortage) {
      await connection.query(
        "UPDATE stock SET Damage_Qty = Damage_Qty + ?, Loss_Qty = Loss_Qty + ? WHERE product_id = ? AND isActive = 1",
        [l.damaged, l.loss, l.product_id]
      );
    }
    let dsTracking = null;
    if (withShortage.length) {
      // A zero-value record keeps the stock audit in step: the damage and loss rows sit under it.
      const tracking = trackingId();
      dsTracking = tracking;
      await connection.query(
        `INSERT INTO final_sale (sale_tracking_Id, invoiceNumber, TotalAmount, UserId, DateofTransaction, addedDate,
                                 isSettled, AmountPaid, isGstBilling, created, addedBy, isActive)
         VALUES (?, ?, 0, ?, ?, ?, 1, 0, 0, ?, ?, 1)`,
        [tracking, `DS-${settlementId}`, staffId, date, getISTDate(), now, adminId]
      );
      for (const l of withShortage) {
        const [price] = await connection.query(
          `SELECT price_id FROM product_prices WHERE product_id = ? AND isActive = 1 AND effective_date <= ?
           ORDER BY effective_date DESC LIMIT 1`,
          [l.product_id, date]
        );
        await connection.query(
          `INSERT INTO sales (sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received,
                              is_credit, sale_tracking_Id, sale_date, damaged_count, is_settled, loss_count, is_price_changed, isActive)
           VALUES ('marketing', ?, ?, ?, 0, 0, 0, ?, ?, ?, 1, ?, 0, 1)`,
          [staffId, l.product_id, price[0] ? price[0].price_id : null, tracking, date, l.damaged, l.loss]
        );
      }
    }

    // 3. Close the allocation: what was sold comes off the oldest allocation first, like a normal settlement.
    for (const l of lines) {
      let remaining = l.sold;
      for (const a of l.alloc_rows) {
        const take = Math.min(a.allocated_quantity, remaining);
        remaining -= take;
        await connection.query(
          "UPDATE daily_stock_allocation SET converted_to_sales = 1, allocated_quantity = ? WHERE daily_stock_id = ?",
          [a.allocated_quantity - take, a.daily_stock_id]
        );
      }
    }

    const [[staff]] = await connection.query("SELECT name FROM users WHERE user_id = ?", [staffId]);
    const [[admin]] = adminId ? await connection.query("SELECT name FROM users WHERE user_id = ?", [adminId]) : [[{ name: "Admin" }]];
    const details = {
      settlement_id: settlementId, staff_id: staffId, staff_name: staff ? staff.name : "", date,
      settled_at: now, settled_by: admin ? admin.name : "Admin", notes: req.body.notes || "",
      totals: day.totals, handover,
      vehicle: { name: vehicle.vehicle_name, reg_no: vehicle.vehicle_reg, start_km: vehicle.start_km, end_km: vehicle.end_km, km_run: vehicle.km_run },
      fuel_bills: openFuel.map((f) => ({ bill_no: f.bill_no, amount: f.amount })),
      items: lines.map((l) => ({
        product_id: l.product_id, product_name: l.product_name, allocated: l.allocated, sold: l.sold,
        balance: l.balance, damaged: l.damaged, loss: l.loss, amount: l.amount, price: l.avg_price,
        over_sold: l.over_sold, not_allocated: l.not_allocated,
        reported_damage: reported[l.product_id] || 0,
      })),
      invoices: posted,
      // Everything Undo needs to put the day back exactly as it was.
      undo: {
        ds_tracking: dsTracking,
        settle_requested_at: req0.settle_requested_at,
        voucher_ids: voucherIds,
        alloc_before: lines.flatMap((l) => l.alloc_rows.map((a) => ({ daily_stock_id: a.daily_stock_id, allocated_quantity: a.allocated_quantity }))),
      },
    };
    await connection.query("UPDATE app_day_settlements SET details = ? WHERE settlement_id = ?", [JSON.stringify(details), settlementId]);
    // The phone's damage report has now been used.
    await connection.query("DELETE FROM app_damage_reports WHERE staff_id = ? AND report_date = ?", [staffId, date]);
    await connection.commit();

    await logUserActivity({
      req, user_id: adminId,
      action: `Day settlement ${settlementId} for ${details.staff_name} on ${date}: ${posted.length} invoice(s), Rs. ${day.totals.total}, expenses Rs. ${expenses.total}, received Rs. ${received.total} of net Rs. ${netPayable}`,
      reference_type: "app_day_settlement", reference_id: settlementId,
    });
    res.json({ message: `Settled ${posted.length} invoice(s)`, settlement: details });
  } catch (error) {
    await connection.rollback();
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("settleDay error:", error);
    res.status(500).json({ message: `Could not settle the day: ${error.message}` });
  } finally {
    connection.release();
  }
};


// One line per salesperson for a date: stock given, sold on the phone, damage reported, balance and whether
// the day is settled. Lets the office see everybody at a glance before opening one person to settle.
exports.overview = async (req, res) => {
  try {
    const date = req.body.date;
    if (!isDate(date)) return res.status(400).json({ message: "Choose a date" });
    const [alloc] = await pool.query(
      `SELECT marketing_staff_id AS staff_id, SUM(allocated_quantity) AS allocated
       FROM daily_stock_allocation
       WHERE converted_to_sales = 0 AND isActive = 1 AND allocated_quantity > 0 AND date <= ?
       GROUP BY marketing_staff_id`,
      [date]
    );
    const [inv] = await pool.query(
      `SELECT staff_id, COUNT(*) AS invoices, SUM(total_amount) AS total
       FROM app_invoices WHERE invoice_date = ? AND status = 'pending' GROUP BY staff_id`,
      [date]
    );
    const [sold] = await pool.query(
      `SELECT i.staff_id, SUM(it.quantity) AS sold
       FROM app_invoice_items it JOIN app_invoices i ON i.app_invoice_id = it.app_invoice_id
       WHERE i.invoice_date = ? AND i.status = 'pending' GROUP BY i.staff_id`,
      [date]
    );
    const [dmg] = await pool.query(
      "SELECT staff_id, SUM(damaged_qty) AS damaged FROM app_damage_reports WHERE report_date = ? GROUP BY staff_id",
      [date]
    );
    const [done] = await pool.query(
      `SELECT staff_id, MAX(settlement_id) AS settlement_id, COUNT(*) AS times, SUM(total_amount) AS total
       FROM app_day_settlements WHERE settle_date = ? AND invoice_count > 0 GROUP BY staff_id`,
      [date]
    );

    const [reqd] = await pool.query(
      "SELECT i.staff_id, i.end_km, i.start_km, v.name AS vehicle_name, v.reg_no AS vehicle_reg, DATE_FORMAT(i.settle_requested_at, '%H:%i') AS at FROM app_day_info i LEFT JOIN app_vehicles v ON v.vehicle_id = i.vehicle_id WHERE i.info_date = ? AND i.settle_requested_at IS NOT NULL",
      [date]
    );

    const byStaff = new Map();
    const row = (id) => {
      if (!byStaff.has(id)) byStaff.set(id, { staff_id: id, requested: false, requested_at: null, end_km: null, allocated: 0, sold: 0, damaged: 0, invoices: 0, pending_total: 0, settled: false, settlement_id: null, settled_total: 0 });
      return byStaff.get(id);
    };
    alloc.forEach((a) => { row(a.staff_id).allocated = Number(a.allocated); });
    inv.forEach((a) => { const r = row(a.staff_id); r.invoices = a.invoices; r.pending_total = money(a.total); });
    sold.forEach((a) => { row(a.staff_id).sold = Number(a.sold); });
    dmg.forEach((a) => { row(a.staff_id).damaged = Number(a.damaged); });
    reqd.forEach((a) => { const r = row(a.staff_id); r.requested = true; r.requested_at = a.at; r.end_km = a.end_km === null ? null : Number(a.end_km); r.km_run = a.end_km !== null && a.start_km !== null && Number(a.end_km) >= Number(a.start_km) ? Math.round((Number(a.end_km) - Number(a.start_km)) * 10) / 10 : null; r.vehicle = a.vehicle_name ? `${a.vehicle_name} ${a.vehicle_reg}` : null; });
    done.forEach((a) => { const r = row(a.staff_id); r.settled = true; r.settlement_id = a.settlement_id; r.settled_total = money(a.total); });

    const ids = [...byStaff.keys()];
    const names = new Map();
    if (ids.length) {
      const [u] = await pool.query("SELECT user_id, name FROM users WHERE user_id IN (?)", [ids]);
      u.forEach((x) => names.set(x.user_id, x.name));
    }
    const staff = [...byStaff.values()]
      .map((r) => ({
        ...r,
        staff_name: names.get(r.staff_id) || `#${r.staff_id}`,
        left: Math.max(0, r.allocated - r.sold),
        balance: Math.max(0, r.allocated - r.sold) - r.damaged,
        over_sold: r.sold > r.allocated,
        status: r.invoices > 0 ? "pending" : r.settled ? "settled" : r.allocated > 0 ? "allocated" : "none",
      }))
      .sort((a, b) => a.staff_name.localeCompare(b.staff_name));
    res.json({ date, staff });
  } catch (error) {
    console.error("overview error:", error);
    res.status(500).json({ message: "Could not load the overview" });
  }
};


// Puts a settled day back exactly as it was: stock, damage and loss, allocation, expenses and the books.
// The invoices go back to "pending" so they can be corrected and the day settled again.
exports.undoDay = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const settlementId = Number(req.body.settlement_id);
    const adminId = req.body.userId || null;
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT * FROM app_day_settlements WHERE settlement_id = ? FOR UPDATE", [settlementId]);
    const row = rows[0];
    if (!row || !row.details) throw fail(404, "Settlement not found");
    const d = JSON.parse(row.details);
    if (d.undone) throw fail(400, "This settlement was already undone");
    if (!d.undo) throw fail(400, "This settlement was made before Undo existed. Ask for it to be corrected by hand.");

    const [[{ later }]] = await connection.query(
      "SELECT COUNT(*) AS later FROM app_day_settlements WHERE staff_id = ? AND settlement_id > ? AND invoice_count > 0",
      [row.staff_id, settlementId]
    );
    if (later > 0) throw fail(400, "A later day for this salesperson is settled. Undo that one first.");

    // Sales returns made against these sales cannot be reversed from here.
    for (const inv of d.invoices) {
      try {
        const [ret] = await connection.query("SELECT 1 FROM direct_sale_return WHERE sale_tracking_Id = ? LIMIT 1", [inv.tracking_id]);
        if (ret.length) throw fail(400, `Invoice ${inv.books_no} has a sales return. Remove the return first.`);
      } catch (e) {
        if (e.status) throw e; // a database without the returns table has nothing to block on
      }
    }

    // 1. The invoices: stock comes back, the sale and its payments leave the books, the invoice is pending again.
    let skippedDeleted = 0;
    for (const inv of d.invoices) {
      // An invoice the office deleted from Search Sales already put its stock back and stays deleted.
      const [[gone]] = await connection.query("SELECT COUNT(*) AS n FROM final_sale WHERE sale_tracking_Id = ? AND isActive = 0", [inv.tracking_id]);
      if (gone.n > 0) { skippedDeleted += 1; continue; }
      const [lines] = await connection.query(
        "SELECT product_id, quantity_sold FROM sales WHERE sale_tracking_Id = ? AND isActive = 1",
        [inv.tracking_id]
      );
      for (const l of lines) {
        await connection.query("UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND isActive = 1", [l.quantity_sold, l.product_id]);
      }
      await connection.query("UPDATE sales SET isActive = 0 WHERE sale_tracking_Id = ?", [inv.tracking_id]);
      await connection.query("DELETE FROM stock_History WHERE ReferenceInvoiceOrSale = ?", [inv.tracking_id]);
      await connection.query("UPDATE sales_credit_history SET isActive = 0 WHERE sale_tracking_Id = ?", [inv.tracking_id]);
      await connection.query("UPDATE final_sale SET isActive = 0 WHERE sale_tracking_Id = ?", [inv.tracking_id]);
      await connection.query(
        `UPDATE app_invoices SET status = 'pending', settled_by = NULL, settled_at = NULL, final_sale_tracking_id = NULL,
                system_invoice_number = NULL WHERE app_invoice_id = ?`,
        [inv.invoice_id]
      );
      // Money collected later against this invoice is posted again when the day is settled again.
      await connection.query("UPDATE app_payment_allocations SET posted = 0 WHERE invoice_id = ?", [inv.invoice_id]);
    }

    // 2. Damage and loss go back into usable stock (only what is still recorded: the office may have deleted
    //    that record already, which put it back), and the record that carried them is removed.
    if (d.undo.ds_tracking) {
      const [shortage] = await connection.query(
        "SELECT product_id, damaged_count, loss_count FROM sales WHERE sale_tracking_Id = ? AND isActive = 1",
        [d.undo.ds_tracking]
      );
      for (const i of shortage) {
        if (i.damaged_count > 0 || i.loss_count > 0) {
          await connection.query(
            "UPDATE stock SET Damage_Qty = GREATEST(0, Damage_Qty - ?), Loss_Qty = GREATEST(0, Loss_Qty - ?) WHERE product_id = ? AND isActive = 1",
            [i.damaged_count, i.loss_count, i.product_id]
          );
        }
      }
    }
    if (d.undo.ds_tracking) {
      await connection.query("UPDATE sales SET isActive = 0 WHERE sale_tracking_Id = ?", [d.undo.ds_tracking]);
      await connection.query("UPDATE final_sale SET isActive = 0 WHERE sale_tracking_Id = ?", [d.undo.ds_tracking]);
    }

    // 3. The allocation is open again with its original quantities.
    for (const a of d.undo.alloc_before) {
      await connection.query(
        "UPDATE daily_stock_allocation SET allocated_quantity = ?, converted_to_sales = 0 WHERE daily_stock_id = ?",
        [a.allocated_quantity, a.daily_stock_id]
      );
    }

    await connection.query("UPDATE app_fuel_entries SET settlement_id = NULL WHERE settlement_id = ?", [settlementId]);
    // The salesperson's settlement request is open again, so the day can be settled again after corrections.
    if (d.undo.settle_requested_at) {
      await connection.query("UPDATE app_day_info SET settle_requested_at = ? WHERE staff_id = ? AND info_date = ?", [
        d.undo.settle_requested_at, row.staff_id, d.date,
      ]);
    }

    // 4. Expenses entered with the settlement.
    if (d.undo.voucher_ids.length) {
      await connection.query("UPDATE misc_expense_vouchers SET isActive = 0 WHERE voucher_id IN (?)", [d.undo.voucher_ids]);
    }

    // 5. The damage the salesperson reported on the phone is there again for the next settlement.
    const now = getISTTimestamp();
    for (const i of d.items) {
      if (i.reported_damage > 0) {
        await connection.query(
          `INSERT INTO app_damage_reports (staff_id, report_date, product_id, damaged_qty, updated_at) VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE damaged_qty = VALUES(damaged_qty), updated_at = VALUES(updated_at)`,
          [row.staff_id, d.date, i.product_id, i.reported_damage, now]
        );
      }
    }

    d.undone = { at: now, by: adminId };
    await connection.query("UPDATE app_day_settlements SET details = ?, invoice_count = 0 WHERE settlement_id = ?", [JSON.stringify(d), settlementId]);
    await connection.commit();

    await logUserActivity({
      req, user_id: adminId,
      action: `Day settlement ${settlementId} for ${d.staff_name} on ${d.date} undone: ${d.invoices.length} invoice(s) back to pending`,
      reference_type: "app_day_settlement", reference_id: settlementId,
    });
    const back = d.invoices.length - skippedDeleted;
    res.json({ message: `Settlement ${settlementId} undone. ${back} invoice(s) are pending again${skippedDeleted ? ` (${skippedDeleted} deleted earlier stay deleted)` : ""}.` });
  } catch (error) {
    await connection.rollback();
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("undoDay error:", error);
    res.status(500).json({ message: `Could not undo the settlement: ${error.message}` });
  } finally {
    connection.release();
  }
};

exports.listSettlements = async (req, res) => {
  try {
    const { from, to, staff_id } = req.body;
    const conditions = ["1 = 1"];
    const params = [];
    if (isDate(from)) { conditions.push("d.settle_date >= ?"); params.push(from); }
    if (isDate(to)) { conditions.push("d.settle_date <= ?"); params.push(to); }
    if (staff_id) { conditions.push("d.staff_id = ?"); params.push(Number(staff_id)); }
    const [rows] = await pool.query(
      `SELECT d.details, d.settlement_id, d.staff_id, u.name AS staff_name, DATE_FORMAT(d.settle_date, '%Y-%m-%d') AS settle_date,
              DATE_FORMAT(d.settled_at, '%Y-%m-%d %H:%i:%s') AS settled_at, d.invoice_count, d.total_amount,
              d.cash_amount, d.upi_amount, d.card_amount, d.credit_amount
       FROM app_day_settlements d LEFT JOIN users u ON u.user_id = d.staff_id
       WHERE ${conditions.join(" AND ")} ORDER BY d.settlement_id DESC LIMIT 100`,
      params
    );
    res.json({
      settlements: rows.map(({ details, ...r }) => {
        let h = null;
        try { h = details ? JSON.parse(details).handover : null; } catch (e) { h = null; }
        let undone = false;
        try { undone = !!(details && JSON.parse(details).undone); } catch (e) { undone = false; }
        return { ...r, received_total: h ? h.received.total : null, difference: h ? h.difference : null, undone };
      }),
    });
  } catch (error) {
    console.error("listSettlements error:", error);
    res.status(500).json({ message: "Could not load settlements" });
  }
};

exports.settlementDetail = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT details FROM app_day_settlements WHERE settlement_id = ?", [Number(req.body.settlement_id)]);
    if (!rows[0] || !rows[0].details) return res.status(404).json({ message: "Settlement not found" });
    res.json({ settlement: JSON.parse(rows[0].details) });
  } catch (error) {
    console.error("settlementDetail error:", error);
    res.status(500).json({ message: "Could not load the settlement" });
  }
};
