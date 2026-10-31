// What a salesperson may still sell: the stock they took (the office's allocation plus anything they asked for
// from the phone that is still waiting to be verified), less what is already on their unsettled invoices.
const fail = (status, message) => Object.assign(new Error(message), { status });

const sellableByProduct = async (db, staffId, date, excludeInvoiceId = 0) => {
  const [alloc] = await db.query(
    `SELECT product_id, SUM(allocated_quantity) AS q FROM daily_stock_allocation
     WHERE marketing_staff_id = ? AND converted_to_sales = 0 AND isActive = 1 AND allocated_quantity > 0 AND date <= ?
     GROUP BY product_id`,
    [staffId, date]
  );
  // Only the part not yet allocated counts: a change request that raises 10 to 15 adds 5, one that lowers it adds nothing.
  // A request is for its own day: one the office never verified does not carry into the next day.
  const [asked] = await db.query(
    `SELECT it.product_id, SUM(GREATEST(0, it.requested_qty - COALESCE(it.approved_qty, 0))) AS q
     FROM app_self_allocation_items it JOIN app_self_allocations r ON r.request_id = it.request_id
     WHERE r.staff_id = ? AND r.status = 'pending' AND r.alloc_date = ?
     GROUP BY it.product_id`,
    [staffId, date]
  );
  const [sold] = await db.query(
    `SELECT it.product_id, SUM(it.quantity) AS q
     FROM app_invoice_items it JOIN app_invoices i ON i.app_invoice_id = it.app_invoice_id
     WHERE i.staff_id = ? AND i.status = 'pending' AND i.invoice_date <= ? AND i.app_invoice_id <> ?
     GROUP BY it.product_id`,
    [staffId, date, excludeInvoiceId]
  );
  const map = new Map();
  const row = (id) => {
    if (!map.has(id)) map.set(id, { allocated: 0, asked: 0, sold: 0 });
    return map.get(id);
  };
  alloc.forEach((a) => { row(a.product_id).allocated = Number(a.q); });
  asked.forEach((a) => { row(a.product_id).asked = Number(a.q); });
  sold.forEach((a) => { row(a.product_id).sold = Number(a.q); });
  for (const r of map.values()) r.available = r.allocated + r.asked - r.sold;
  return map;
};

// lines: [{ productId, quantity, name? }]. Throws a 400 naming every product that goes beyond the stock taken.
const assertSellable = async (db, staffId, date, lines, excludeInvoiceId = 0) => {
  const map = await sellableByProduct(db, staffId, date, excludeInvoiceId);
  const names = new Map();
  const ids = lines.map((l) => l.productId);
  if (ids.length) {
    const [p] = await db.query("SELECT product_id, product_name FROM products WHERE product_id IN (?)", [ids]);
    p.forEach((x) => names.set(x.product_id, x.product_name));
  }
  const problems = [];
  for (const l of lines) {
    const r = map.get(l.productId) || { allocated: 0, asked: 0, sold: 0, available: 0 };
    if (l.quantity > r.available) {
      const name = l.name || names.get(l.productId) || `Product ${l.productId}`;
      const taken = r.allocated + r.asked;
      problems.push(
        taken === 0
          ? `${name}: you have not taken this item. Take it from Take stock first.`
          : `${name}: you can sell ${Math.max(0, r.available)} more (taken ${taken}, already on invoices ${r.sold}), but this has ${l.quantity}.`
      );
    }
  }
  if (problems.length) throw fail(400, `Not enough stock with you. ${problems.join(" ")}`);
};

module.exports = { sellableByProduct, assertSellable };
