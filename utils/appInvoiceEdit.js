const { getISTDate } = require("./dateUtils");
const { assertSellable } = require("./appSellable");

const PRICE_ALERT_PCT = Number(process.env.APP_PRICE_ALERT_PCT) || 10;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fail = (status, message) => Object.assign(new Error(message), { status });

// Latest marketing price per product, same rule as when an invoice is made.
const LATEST_PRICE_SQL = `
  SELECT p.product_id, p.product_name, pp.price_id, pp.marketing_selling_price AS price
  FROM products p
  JOIN product_prices pp ON pp.price_id = (
    SELECT p2.price_id FROM product_prices p2
    WHERE p2.product_id = p.product_id AND p2.isActive = 1 AND p2.effective_date <= ?
    ORDER BY p2.effective_date DESC, p2.price_id DESC LIMIT 1
  )
  WHERE p.isActive = 1`;

// Changes the lines, prices, payment and note of a pending invoice. Used by the office (any invoice)
// and by the salesperson (only their own, pass onlyStaffId). Must run inside a transaction.
// Throws an error carrying an HTTP status for anything the caller should be told about.
const editPendingInvoice = async (conn, { invoiceId, items, payment = {}, notes, onlyStaffId = null }) => {
  if (!Array.isArray(items) || items.length === 0) throw fail(400, "An invoice needs at least one item");

  const [invRows] = await conn.query("SELECT * FROM app_invoices WHERE app_invoice_id = ? FOR UPDATE", [invoiceId]);
  const inv = invRows[0];
  if (!inv || (onlyStaffId !== null && inv.staff_id !== onlyStaffId)) throw fail(404, "Invoice not found");
  if (inv.status !== "pending") {
    throw fail(400, `This invoice is already ${inv.status} and cannot be edited${onlyStaffId !== null ? ". Ask the office." : ""}`);
  }

  const [oldItems] = await conn.query(
    `SELECT it.*, p.product_name FROM app_invoice_items it JOIN products p ON p.product_id = it.product_id
     WHERE it.app_invoice_id = ?`,
    [invoiceId]
  );
  const oldByProduct = new Map(oldItems.map((o) => [o.product_id, o]));
  const [latest] = await conn.query(LATEST_PRICE_SQL, [getISTDate()]);
  const latestByProduct = new Map(latest.map((p) => [p.product_id, p]));

  let total = 0, diffAmount = 0, maxPct = 0, maxAbovePct = 0, anyBelow = false;
  const lines = [];
  const seen = new Set();
  for (const raw of items) {
    const productId = Number(raw.product_id);
    const quantity = Number(raw.quantity);
    const soldPrice = money(raw.price);
    const product = latestByProduct.get(productId);
    const name = (oldByProduct.get(productId) || product || {}).product_name || `Product ${productId}`;
    if (!product && !oldByProduct.has(productId)) throw fail(400, "A product is no longer available");
    if (seen.has(productId)) throw fail(400, `${name} is added twice`);
    seen.add(productId);
    if (!Number.isInteger(quantity) || quantity <= 0) throw fail(400, `Enter a whole quantity for ${name}`);
    if (!(soldPrice > 0)) throw fail(400, `Enter a price for ${name}`);

    const old = oldByProduct.get(productId);
    // A line that was already on the invoice keeps the price it was compared against.
    const systemPrice = money(old ? old.system_price : product.price);
    const priceId = old ? old.price_id : product.price_id;
    const lineTotal = money(quantity * soldPrice);
    total = money(total + lineTotal);
    diffAmount = money(diffAmount + (soldPrice - systemPrice) * quantity);
    if (systemPrice > 0) {
      maxPct = Math.max(maxPct, Math.abs(soldPrice - systemPrice) / systemPrice * 100);
      if (soldPrice > systemPrice) maxAbovePct = Math.max(maxAbovePct, (soldPrice - systemPrice) / systemPrice * 100);
    }
    if (soldPrice < systemPrice - 0.004) anyBelow = true;
    lines.push({ productId, name, quantity, systemPrice, soldPrice, lineTotal, priceId });
  }

  // The salesperson can only sell what they took; the office may correct any invoice and settlement checks the rest.
  if (onlyStaffId !== null) {
    const [[d]] = await conn.query("SELECT DATE_FORMAT(invoice_date, '%Y-%m-%d') AS d FROM app_invoices WHERE app_invoice_id = ?", [invoiceId]);
    await assertSellable(conn, onlyStaffId, d.d, lines.map((l) => ({ productId: l.productId, quantity: l.quantity, name: l.name })), invoiceId);
  }

  const cash = money(payment.cash), upi = money(payment.upi), card = money(payment.card);
  if (cash < 0 || upi < 0 || card < 0) throw fail(400, "Payment cannot be negative");
  const paid = money(cash + upi + card);
  if (paid > total + 0.005) throw fail(400, "Payment is more than the invoice total");
  const credit = money(total - paid);
  const [[{ collected }]] = await conn.query(
    "SELECT COALESCE(SUM(amount), 0) AS collected FROM app_payment_allocations WHERE invoice_id = ?",
    [invoiceId]
  );
  if (credit + 0.005 < collected) {
    throw fail(400, `Rs. ${collected} was collected later against this invoice. The unpaid part cannot be less than that.`);
  }
  const flag = anyBelow || maxAbovePct >= PRICE_ALERT_PCT ? 1 : 0;
  maxPct = Math.round(maxPct * 100) / 100;

  await conn.query("DELETE FROM app_invoice_items WHERE app_invoice_id = ?", [invoiceId]);
  for (const l of lines) {
    await conn.query(
      `INSERT INTO app_invoice_items (app_invoice_id, product_id, price_id, quantity, system_price, sold_price, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [invoiceId, l.productId, l.priceId, l.quantity, l.systemPrice, l.soldPrice, l.lineTotal]
    );
  }
  const note = notes === undefined ? inv.notes : (String(notes || "").trim().slice(0, 500) || null);
  await conn.query(
    `UPDATE app_invoices SET total_amount = ?, cash_amount = ?, upi_amount = ?, card_amount = ?, credit_amount = ?,
            price_diff_amount = ?, max_price_diff_pct = ?, price_flag = ?, notes = ? WHERE app_invoice_id = ?`,
    [total, cash, upi, card, credit, diffAmount, maxPct, flag, note, invoiceId]
  );

  return {
    invoiceNo: inv.invoice_no,
    oldTotal: Number(inv.total_amount),
    total, credit, flag,
    before: oldItems.map((o) => `${o.product_name} ${o.quantity}x${Number(o.sold_price)}`).join(", "),
    after: lines.map((l) => `${l.name} ${l.quantity}x${l.soldPrice}`).join(", "),
  };
};

module.exports = { editPendingInvoice };
