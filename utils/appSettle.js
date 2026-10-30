const { getISTTimestamp, getISTDate } = require("./dateUtils");
const { postAllocation } = require("./appDues");
const crypto = require("crypto");

const trackingId = () => crypto.randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);

const ALLOCATION_MESSAGE =
  "This salesperson has stock allocations. Use Day Settlement so the allocation, balance and damage are checked.";

// Posts one pending app invoice into the normal books (direct sale, stock debit, payments).
// Runs inside the caller's transaction. When the salesperson still has outstanding stock allocations
// the invoice must go through Day Settlement instead (checkAllocation).
const postInvoiceTx = async (connection, invoiceId, adminId, { checkAllocation = true } = {}) => {
  const [invRows] = await connection.query(
    `SELECT *, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_text,
            DATE_FORMAT(invoice_date, '%Y-%m-%d') AS invoice_date_text
     FROM app_invoices WHERE app_invoice_id = ? FOR UPDATE`,
    [invoiceId]
  );
  const inv = invRows[0];
  if (!inv) throw new Error("Invoice not found");
  if (inv.status !== "pending") throw new Error(`Already ${inv.status}`);

  if (checkAllocation) {
    const [[{ n }]] = await connection.query(
      `SELECT COUNT(*) AS n FROM daily_stock_allocation
       WHERE marketing_staff_id = ? AND converted_to_sales = 0 AND isActive = 1 AND allocated_quantity > 0 AND date <= ?`,
      [inv.staff_id, inv.invoice_date_text]
    );
    if (n > 0) throw new Error(ALLOCATION_MESSAGE);
  }

  const [shopRows] = await connection.query("SELECT * FROM app_shops WHERE shop_id = ?", [inv.shop_id]);
  const shop = shopRows[0];
  const [items] = await connection.query("SELECT * FROM app_invoice_items WHERE app_invoice_id = ?", [invoiceId]);
  if (!shop || items.length === 0) throw new Error("Invoice has no shop or items");

  // The shop becomes a normal customer the first time one of its invoices is settled.
  let customerId = shop.customer_id;
  const gst = shop.gst_number || null;
  if (customerId) {
    if (gst) await connection.query("UPDATE Customers SET GstNumber = ? WHERE id = ?", [gst, customerId]);
  } else {
    const [created] = await connection.query(
      `INSERT INTO Customers (Name, Place, Mobile, EmailId, GstNumber, WalletAmount, addedBy, isActive)
       VALUES (?, ?, ?, '', ?, 0, ?, 1)`,
      [shop.shop_name, (shop.address || "").slice(0, 500), shop.phone || shop.owner_phone || "", gst, inv.staff_id]
    );
    customerId = created.insertId;
    await connection.query("UPDATE app_shops SET customer_id = ? WHERE shop_id = ?", [customerId, shop.shop_id]);
  }

  const [counterRows] = await connection.query("SELECT * FROM invoive_number_counter WHERE isActive = 1 FOR UPDATE");
  const counter = counterRows[0];
  if (!counter) throw new Error("Invoice counter row missing");
  const isGst = !!gst;
  const nextCounter = ((isGst ? counter.GST_counter : counter.NGST_counter) || 0) + 1;
  const prefix = isGst ? counter.GST_prefix : counter.NGST_prefix;
  const suffix = isGst ? counter.GST_suffix : counter.NGST_suffix;
  const invoiceNumber = `${prefix}${String(nextCounter).padStart(5, "0")}${suffix}`;
  await connection.query(
    `UPDATE invoive_number_counter SET ${isGst ? "GST_counter" : "NGST_counter"} = ?, modified = ? WHERE isActive = 1`,
    [nextCounter, getISTTimestamp()]
  );

  const total = Number(inv.total_amount);
  const paid = Number(inv.cash_amount) + Number(inv.upi_amount) + Number(inv.card_amount);
  const saleDate = inv.invoice_date_text;
  const settledFlag = paid + 0.005 >= total ? 1 : 0;
  const tracking = trackingId();
  const now = getISTTimestamp();

  await connection.query(
    `INSERT INTO final_sale (sale_tracking_Id, invoiceNumber, TotalAmount, UserId, DateofTransaction, addedDate,
                             isSettled, AmountPaid, isGstBilling, created, addedBy, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [tracking, invoiceNumber, total, customerId, saleDate, getISTDate(), settledFlag, paid, isGst ? 1 : 0, now, adminId]
  );

  if (paid > 0) {
    await connection.query(
      `INSERT INTO sales_credit_history (UPI, Cash, Card, sale_tracking_Id, amount, creditedDate, isActive)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [inv.upi_amount, inv.cash_amount, inv.card_amount, tracking, Math.round(paid), inv.created_text]
    );
  }

  for (const it of items) {
    await connection.query(
      `INSERT INTO sales (sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received,
                          is_credit, sale_tracking_Id, sale_date, damaged_count, is_settled, loss_count, is_price_changed, isActive)
       VALUES ('direct', ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, 0, ?, 1)`,
      [inv.staff_id, it.product_id, it.price_id, it.quantity, it.line_total, tracking, saleDate, settledFlag,
       Number(it.sold_price) !== Number(it.system_price) ? 1 : 0]
    );
    await connection.query("UPDATE stock SET quantity = quantity - ? WHERE product_id = ?", [it.quantity, it.product_id]);
    const [stockRows] = await connection.query("SELECT stock_id FROM stock WHERE product_id = ? AND isActive = 1", [it.product_id]);
    if (stockRows[0]) {
      await connection.query(
        `INSERT INTO stock_History (stock_Id, Qty, stock_type, AddedDate, AddedBy, CreditOrDebit, ReferenceInvoiceOrSale)
         VALUES (?, ?, 'sale', ?, ?, 'debit', ?)`,
        [stockRows[0].stock_id, -it.quantity, getISTDate(), adminId || 0, tracking]
      );
    }
  }

  await connection.query(
    `UPDATE app_invoices SET status = 'settled', settled_by = ?, settled_at = ?, final_sale_tracking_id = ?,
            system_invoice_number = ? WHERE app_invoice_id = ?`,
    [adminId || null, now, tracking, invoiceNumber, invoiceId]
  );
  // Money collected against this invoice before it was settled goes into the books now.
  const [waiting] = await connection.query(
    `SELECT *, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at_text
     FROM app_payment_allocations WHERE invoice_id = ? AND posted = 0`,
    [invoiceId]
  );
  for (const a of waiting) await postAllocation(connection, a, tracking);

  return { inv, invoiceNumber, tracking };
};

module.exports = { postInvoiceTx, trackingId, ALLOCATION_MESSAGE };
