// When the office allocates stock by hand (the allocation form, or "Add missing allocation" on the settlement screen) for a
// salesperson who also asked for that stock with Take stock, the waiting request is covered by it. Without this, verifying
// the request later allocates the same stock a second time, and the phone adds the waiting ask on top of the allocation.
// Raises the approved quantity of the matching items of that day's waiting request, never above what was asked.
const coverWaitingRequests = async (db, staffId, date, lines) => {
  for (const l of lines) {
    const qty = Number(l.quantity);
    if (!(qty > 0)) continue;
    try {
      await db.query(
        `UPDATE app_self_allocation_items it JOIN app_self_allocations r ON r.request_id = it.request_id
         SET it.approved_qty = LEAST(it.requested_qty, COALESCE(it.approved_qty, 0) + ?)
         WHERE r.staff_id = ? AND r.alloc_date = ? AND r.status = 'pending' AND it.product_id = ?
           AND it.requested_qty > COALESCE(it.approved_qty, 0)`,
        [qty, staffId, date, Number(l.product_id)]
      );
    } catch (e) { /* a database without the self-allocation tables has nothing to cover */ }
  }
};
module.exports = { coverWaitingRequests };
