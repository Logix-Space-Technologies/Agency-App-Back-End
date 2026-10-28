const { getISTTimestamp } = require("./dateUtils");
const { deletedByAdmin } = require("./appInvoiceStatus");

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

// SQL for "unpaid part of an invoice": what was left on credit minus what was collected later.
const OUTSTANDING_SQL = `GREATEST(0, i.credit_amount - COALESCE(c.collected, 0))`;
const COLLECTED_JOIN = `LEFT JOIN (
    SELECT invoice_id, SUM(amount) AS collected FROM app_payment_allocations GROUP BY invoice_id
  ) c ON c.invoice_id = i.app_invoice_id`;

// Unpaid invoices of one shop, oldest first. Rejected and office-deleted invoices carry no dues.
const outstandingInvoices = async (db, shopId, excludeInvoiceId = 0) => {
  const [rows] = await db.query(
    `SELECT i.app_invoice_id, i.invoice_no, DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
            i.total_amount, i.credit_amount, i.status, COALESCE(c.collected, 0) AS collected,
            ${OUTSTANDING_SQL} AS outstanding
     FROM app_invoices i ${COLLECTED_JOIN}
     WHERE i.shop_id = ? AND i.app_invoice_id <> ? AND i.status <> 'rejected' AND NOT ${deletedByAdmin("i")}
       AND ${OUTSTANDING_SQL} > 0.004
     ORDER BY i.invoice_date, i.app_invoice_id`,
    [shopId, excludeInvoiceId]
  );
  return rows.map((r) => ({ ...r, outstanding: money(r.outstanding), collected: money(r.collected) }));
};

// Total dues for many shops at once: { shop_id: { dues, invoices, oldest } }.
const duesByShop = async (db, shopIds) => {
  if (!shopIds.length) return {};
  const [rows] = await db.query(
    `SELECT i.shop_id, SUM(${OUTSTANDING_SQL}) AS dues, COUNT(*) AS invoices,
            DATE_FORMAT(MIN(i.invoice_date), '%Y-%m-%d') AS oldest
     FROM app_invoices i ${COLLECTED_JOIN}
     WHERE i.shop_id IN (?) AND i.status <> 'rejected' AND NOT ${deletedByAdmin("i")}
       AND ${OUTSTANDING_SQL} > 0.004
     GROUP BY i.shop_id`,
    [shopIds]
  );
  const map = {};
  for (const r of rows) map[r.shop_id] = { dues: money(r.dues), invoices: r.invoices, oldest: r.oldest };
  return map;
};

// Adds a collected amount to the office sale behind a settled invoice, the same way the web's
// credit collection does: raise AmountPaid and write a payment history row.
const postAllocation = async (db, allocation, trackingId) => {
  const amount = Number(allocation.amount);
  await db.query(
    `UPDATE final_sale SET AmountPaid = AmountPaid + ?,
            isSettled = IF(AmountPaid + ? >= TotalAmount - 0.005, 1, isSettled)
     WHERE sale_tracking_Id = ? AND isActive = 1`,
    [amount, amount, trackingId]
  );
  await db.query(
    `INSERT INTO sales_credit_history (UPI, Cash, Card, sale_tracking_Id, amount, creditedDate, isActive)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [allocation.upi_amount, allocation.cash_amount, allocation.card_amount, trackingId, Math.round(amount), allocation.created_at_text]
  );
  await db.query("UPDATE app_payment_allocations SET posted = 1 WHERE allocation_id = ?", [allocation.allocation_id]);
};

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

// Takes money from a shop and spreads it over its unpaid invoices, oldest first.
// Must run inside a transaction. Allocations on invoices already booked in the office system are
// posted straight away; the rest are posted when the invoice is settled.
const collectDues = async (conn, { shopId, staffId, payment, withInvoiceId = null, clientUuid = null }) => {
  const cash = money(payment.cash), upi = money(payment.upi), card = money(payment.card);
  if (cash < 0 || upi < 0 || card < 0) throw badRequest("Payment cannot be negative");
  const total = money(cash + upi + card);
  if (total <= 0) return { total: 0, allocations: [] };

  // Lock this shop's invoices so two phones cannot spend the same dues.
  await conn.query("SELECT app_invoice_id FROM app_invoices WHERE shop_id = ? FOR UPDATE", [shopId]);
  const open = await outstandingInvoices(conn, shopId, withInvoiceId || 0);
  const dues = money(open.reduce((t, o) => t + o.outstanding, 0));
  if (total > dues + 0.005) {
    throw badRequest(dues > 0
      ? `This shop owes only Rs. ${dues.toFixed(2)}. Reduce the old dues amount.`
      : "This shop has no old dues to collect.");
  }

  const now = getISTTimestamp();
  const [paid] = await conn.query(
    `INSERT INTO app_payments (shop_id, staff_id, client_uuid, with_invoice_id, cash_amount, upi_amount, card_amount, total_amount, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shopId, staffId, clientUuid, withInvoiceId, cash, upi, card, total, now]
  );

  // Hand out cash first, then UPI, then card, to the oldest invoice first.
  const pool = { cash, upi, card };
  const take = (kind, need) => {
    const got = Math.min(pool[kind], need);
    pool[kind] = money(pool[kind] - got);
    return got;
  };
  let left = total;
  const allocations = [];
  for (const inv of open) {
    if (left <= 0.004) break;
    let need = Math.min(inv.outstanding, left);
    const c = take("cash", need); need = money(need - c);
    const u = take("upi", need); need = money(need - u);
    const k = take("card", need);
    const amount = money(c + u + k);
    if (amount <= 0) continue;
    left = money(left - amount);

    const [res] = await conn.query(
      `INSERT INTO app_payment_allocations (payment_id, invoice_id, amount, cash_amount, upi_amount, card_amount, posted, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [paid.insertId, inv.app_invoice_id, amount, c, u, k, now]
    );
    const allocation = { allocation_id: res.insertId, amount, cash_amount: c, upi_amount: u, card_amount: k, created_at_text: now };
    if (inv.status === "settled") {
      const [t] = await conn.query("SELECT final_sale_tracking_id FROM app_invoices WHERE app_invoice_id = ?", [inv.app_invoice_id]);
      if (t[0] && t[0].final_sale_tracking_id) await postAllocation(conn, allocation, t[0].final_sale_tracking_id);
    }
    allocations.push({ invoice_id: inv.app_invoice_id, invoice_no: inv.invoice_no, amount });
  }
  return { payment_id: paid.insertId, total, allocations };
};

module.exports = { outstandingInvoices, duesByShop, collectDues, postAllocation, money };
