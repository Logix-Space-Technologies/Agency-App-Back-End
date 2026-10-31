const pool = require("../config/db");
const { logUserActivity } = require("../utils/logUserActivity");
const { appLog } = require("../utils/appLog");
const { CURRENT_STOCK_SQL } = require("../utils/appStock");
const { getISTTimestamp, getISTDate, isTooOld, MAX_BACKDATE_DAYS } = require("../utils/dateUtils");

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fail = (status, message) => Object.assign(new Error(message), { status });
const MAX_ITEMS = 100;
const MAX_QTY = 100000;

// ---------------------------------------------------------------- shared

// Vehicle KM and the fuel bills of one salesperson day. The settlement page and the printed statement use this too.
const dayInfo = async (db, staffId, date) => {
  const [[info]] = await db.query(
    "SELECT start_km, end_km, DATE_FORMAT(settle_requested_at, '%Y-%m-%d %H:%i:%s') AS settle_requested_at FROM app_day_info WHERE staff_id = ? AND info_date = ?",
    [staffId, date]
  ).then(([rows]) => [[rows[0] || {}]]);
  const [fuel] = await db.query(
    `SELECT fuel_id, amount, bill_no, note, settlement_id, DATE_FORMAT(created_at, '%H:%i') AS time
     FROM app_fuel_entries WHERE staff_id = ? AND fuel_date = ? ORDER BY fuel_id`,
    [staffId, date]
  );
  const start = info.start_km === undefined || info.start_km === null ? null : Number(info.start_km);
  const end = info.end_km === undefined || info.end_km === null ? null : Number(info.end_km);
  return {
    start_km: start,
    end_km: end,
    settle_requested_at: info.settle_requested_at || null,
    km_run: start !== null && end !== null && end >= start ? Math.round((end - start) * 10) / 10 : null,
    fuel: fuel.map((f) => ({ ...f, amount: money(f.amount) })),
    fuel_total: money(fuel.reduce((t, f) => t + Number(f.amount), 0)),
  };
};
exports.dayInfo = dayInfo;

// Requests with their items. `withStock` adds what the store can give right now, for the office.
const loadRequests = async (db, where, params, withStock = false) => {
  const [requests] = await db.query(
    `SELECT r.request_id, r.staff_id, u.name AS staff_name, DATE_FORMAT(r.alloc_date, '%Y-%m-%d') AS alloc_date, r.status,
            r.note, r.admin_note, DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            DATE_FORMAT(r.verified_at, '%Y-%m-%d %H:%i:%s') AS verified_at, vu.name AS verified_by_name
     FROM app_self_allocations r
     LEFT JOIN users u ON u.user_id = r.staff_id
     LEFT JOIN users vu ON vu.user_id = r.verified_by
     WHERE ${where} ORDER BY r.request_id DESC LIMIT 200`,
    params
  );
  if (!requests.length) return [];
  const ids = requests.map((r) => r.request_id);
  const [items] = await db.query(
    `SELECT it.item_id, it.request_id, it.product_id, p.product_name, it.requested_qty, it.approved_qty
            ${withStock ? `, ${CURRENT_STOCK_SQL("it.product_id")} AS available` : ""}
     FROM app_self_allocation_items it LEFT JOIN products p ON p.product_id = it.product_id
     WHERE it.request_id IN (?) ORDER BY it.item_id`,
    [ids]
  );
  return requests.map((r) => ({
    ...r,
    items: items
      .filter((i) => i.request_id === r.request_id)
      .map((i) => ({
        item_id: i.item_id, product_id: i.product_id, product_name: i.product_name || `Product ${i.product_id}`,
        requested_qty: i.requested_qty, approved_qty: i.approved_qty, ...(withStock ? { available: Number(i.available) } : {}),
      })),
  }));
};

// Merges repeated products and checks every line; returns [{ product_id, quantity }].
const cleanItems = async (db, raw) => {
  if (!Array.isArray(raw) || raw.length === 0) throw fail(400, "Add at least one product");
  if (raw.length > MAX_ITEMS) throw fail(400, `At most ${MAX_ITEMS} products in one request`);
  const merged = new Map();
  for (const i of raw) {
    const id = Number(i && i.product_id);
    const qty = Number(i && i.quantity);
    if (!Number.isInteger(id) || id <= 0) throw fail(400, "Choose a product for every line");
    if (!Number.isInteger(qty) || qty <= 0 || qty > MAX_QTY) throw fail(400, "Quantities must be whole numbers above zero");
    merged.set(id, (merged.get(id) || 0) + qty);
  }
  const ids = [...merged.keys()];
  const [found] = await db.query("SELECT product_id, product_name FROM products WHERE product_id IN (?) AND isActive = 1", [ids]);
  const names = new Map(found.map((p) => [p.product_id, p.product_name]));
  const missing = ids.filter((id) => !names.has(id));
  if (missing.length) throw fail(400, "One of the products is not available any more. Refresh and try again.");
  return ids.map((id) => ({ product_id: id, quantity: merged.get(id), product_name: names.get(id) }));
};

// ---------------------------------------------------------------- phone: KM and fuel

const today = () => getISTDate();

// Everything the salesperson sees for today in one call.
exports.getDay = async (req, res) => {
  try {
    const staffId = req.staff.user_id;
    const date = today();
    const info = await dayInfo(pool, staffId, date);
    const [[last]] = await pool.query(
      `SELECT COALESCE(MAX(end_km), MAX(start_km)) AS km FROM app_day_info WHERE staff_id = ? AND info_date < ?`,
      [staffId, date]
    ).then(([rows]) => [[rows[0] || {}]]);
    const requests = await loadRequests(pool, "r.staff_id = ? AND (r.alloc_date = ? OR r.status = 'pending')", [staffId, date]);
    res.json({ date, ...info, last_km: last && last.km !== null && last.km !== undefined ? Number(last.km) : null, requests });
  } catch (error) {
    console.error("App getDay error:", error);
    res.status(500).json({ message: "Could not load your day" });
  }
};

const readKm = (v, label) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 9999999) throw fail(400, `${label} is not a valid number`);
  return Math.round(n * 10) / 10;
};

// Start KM in the morning, end KM in the evening. Either can be sent on its own and changed until the day is settled.
exports.saveKm = async (req, res) => {
  try {
    const staffId = req.staff.user_id;
    const date = today();
    const start = readKm(req.body.start_km, "Start KM");
    const end = readKm(req.body.end_km, "End KM");
    if (start === null && end === null) throw fail(400, "Enter the KM reading");

    const [[settled]] = await pool.query(
      "SELECT COUNT(*) AS n FROM app_day_settlements WHERE staff_id = ? AND settle_date = ? AND invoice_count > 0",
      [staffId, date]
    );
    if (settled.n > 0) throw fail(400, "Today is already settled by the office. Ask them if the KM needs a change.");

    const [rows] = await pool.query("SELECT start_km, end_km FROM app_day_info WHERE staff_id = ? AND info_date = ?", [staffId, date]);
    const cur = rows[0] || {};
    const nextStart = start !== null ? start : cur.start_km === undefined || cur.start_km === null ? null : Number(cur.start_km);
    const nextEnd = end !== null ? end : cur.end_km === undefined || cur.end_km === null ? null : Number(cur.end_km);
    if (nextStart !== null && nextEnd !== null && nextEnd < nextStart) throw fail(400, "End KM cannot be less than the start KM");

    await pool.query(
      `INSERT INTO app_day_info (staff_id, info_date, start_km, end_km, updated_at) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE start_km = VALUES(start_km), end_km = VALUES(end_km), updated_at = VALUES(updated_at)`,
      [staffId, date, nextStart, nextEnd, getISTTimestamp()]
    );
    await appLog({
      req, staffId, action: start !== null ? "km_start" : "km_end",
      details: start !== null ? `Start KM ${nextStart}` : `End KM ${nextEnd}`,
    });
    res.json({ message: "KM saved", ...(await dayInfo(pool, staffId, date)) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("App saveKm error:", error);
    res.status(500).json({ message: "Could not save the KM" });
  }
};

exports.addFuel = async (req, res) => {
  try {
    const staffId = req.staff.user_id;
    const date = today();
    const amount = money(req.body.amount);
    const bill = String(req.body.bill_no || "").trim().slice(0, 60);
    const note = String(req.body.note || "").trim().slice(0, 255) || null;
    if (!(amount > 0) || amount > 1000000) throw fail(400, "Enter the fuel amount");
    if (!bill) throw fail(400, "Enter the bill number");

    const [dup] = await pool.query("SELECT fuel_id FROM app_fuel_entries WHERE staff_id = ? AND bill_no = ? LIMIT 1", [staffId, bill]);
    if (dup.length) throw fail(400, `Bill number ${bill} is already entered`);

    await pool.query(
      "INSERT INTO app_fuel_entries (staff_id, fuel_date, amount, bill_no, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [staffId, date, amount, bill, note, getISTTimestamp()]
    );
    await appLog({ req, staffId, action: "fuel_added", details: `Fuel Rs. ${amount}, bill ${bill}` });
    res.json({ message: "Fuel saved", ...(await dayInfo(pool, staffId, date)) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("App addFuel error:", error);
    res.status(500).json({ message: "Could not save the fuel entry" });
  }
};

exports.deleteFuel = async (req, res) => {
  try {
    const staffId = req.staff.user_id;
    const [rows] = await pool.query("SELECT fuel_id, settlement_id, bill_no, amount FROM app_fuel_entries WHERE fuel_id = ? AND staff_id = ?", [
      Number(req.params.id), staffId,
    ]);
    const row = rows[0];
    if (!row) throw fail(404, "Fuel entry not found");
    if (row.settlement_id) throw fail(400, "The office has already settled this fuel entry");
    await pool.query("DELETE FROM app_fuel_entries WHERE fuel_id = ?", [row.fuel_id]);
    await appLog({ req, staffId, action: "fuel_removed", details: `Fuel Rs. ${row.amount}, bill ${row.bill_no} removed` });
    res.json({ message: "Fuel entry removed", ...(await dayInfo(pool, staffId, today())) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("App deleteFuel error:", error);
    res.status(500).json({ message: "Could not remove the fuel entry" });
  }
};

// "Request settlement": the salesperson says the day's selling is done and gives the closing KM. The office
// can look at the day at any time but can settle it only after this request. Works for today or an older
// day that still has unsettled invoices.
exports.requestSettle = async (req, res) => {
  try {
    const staffId = req.staff.user_id;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.date || "")) ? req.body.date : today();
    if (date > today()) throw fail(400, "You cannot settle a future day");
    const end = readKm(req.body.end_km, "Closing KM");
    if (end === null) throw fail(400, "Enter the vehicle closing KM to request settlement");

    const [[pending]] = await pool.query(
      "SELECT COUNT(*) AS n FROM app_invoices WHERE staff_id = ? AND invoice_date = ? AND status = 'pending'",
      [staffId, date]
    );
    if (!pending.n) throw fail(400, "There are no unsettled sales for this day");

    const [rows] = await pool.query("SELECT start_km FROM app_day_info WHERE staff_id = ? AND info_date = ?", [staffId, date]);
    const start = rows[0] && rows[0].start_km !== null ? Number(rows[0].start_km) : null;
    if (start !== null && end < start) throw fail(400, `Closing KM cannot be less than the start KM (${start})`);

    const now = getISTTimestamp();
    await pool.query(
      `INSERT INTO app_day_info (staff_id, info_date, end_km, settle_requested_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE end_km = VALUES(end_km), settle_requested_at = VALUES(settle_requested_at), updated_at = VALUES(updated_at)`,
      [staffId, date, end, now, now]
    );
    await appLog({ req, staffId, action: "settle_request", details: `Settlement requested for ${date}, closing KM ${end}` });
    res.json({ message: "Settlement requested. The office will settle your day.", ...(await dayInfo(pool, staffId, date)) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("App requestSettle error:", error);
    res.status(500).json({ message: "Could not send the settlement request" });
  }
};

// Take the request back (for example to add one more sale) while the office has not settled the day.
exports.cancelSettleRequest = async (req, res) => {
  try {
    const staffId = req.staff.user_id;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || "")) ? req.query.date : today();
    await pool.query("UPDATE app_day_info SET settle_requested_at = NULL, updated_at = ? WHERE staff_id = ? AND info_date = ?", [
      getISTTimestamp(), staffId, date,
    ]);
    await appLog({ req, staffId, action: "settle_request_cancel", details: `Settlement request for ${date} withdrawn` });
    res.json({ message: "Request withdrawn", ...(await dayInfo(pool, staffId, date)) });
  } catch (error) {
    console.error("App cancelSettleRequest error:", error);
    res.status(500).json({ message: "Could not withdraw the request" });
  }
};

// ---------------------------------------------------------------- phone: self allocation

const insertItems = async (db, requestId, items) => {
  for (const i of items) {
    await db.query("INSERT INTO app_self_allocation_items (request_id, product_id, requested_qty) VALUES (?, ?, ?)", [
      requestId, i.product_id, i.quantity,
    ]);
  }
};

exports.createSelfAllocation = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const staffId = req.staff.user_id;
    // The vehicle KM comes first: no stock request until today's start KM is entered.
    const [[km]] = await connection.query("SELECT start_km FROM app_day_info WHERE staff_id = ? AND info_date = ?", [staffId, today()]).then(([rows]) => [[rows[0] || {}]]);
    if (km.start_km === undefined || km.start_km === null) throw fail(400, "Enter your vehicle KM first, then take stock.");
    const items = await cleanItems(connection, req.body.items);
    const note = String(req.body.note || "").trim().slice(0, 255) || null;
    const now = getISTTimestamp();
    await connection.beginTransaction();
    const [r] = await connection.query(
      "INSERT INTO app_self_allocations (staff_id, alloc_date, status, note, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?, ?)",
      [staffId, today(), note, now, now]
    );
    await insertItems(connection, r.insertId, items);
    await connection.commit();
    await appLog({
      req, staffId, action: "self_allocation",
      details: `Stock request ${r.insertId}: ${items.map((i) => `${i.product_name} x ${i.quantity}`).join(", ")}`.slice(0, 900),
    });
    res.json({ message: "Sent to the office for checking", request_id: r.insertId });
  } catch (error) {
    await connection.rollback();
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("App createSelfAllocation error:", error);
    res.status(500).json({ message: "Could not send the request" });
  } finally {
    connection.release();
  }
};

// Only while the office has not checked it yet.
const ownPending = async (db, requestId, staffId) => {
  const [rows] = await db.query("SELECT request_id, status FROM app_self_allocations WHERE request_id = ? AND staff_id = ? FOR UPDATE", [
    requestId, staffId,
  ]);
  if (!rows[0]) throw fail(404, "Request not found");
  if (rows[0].status !== "pending") throw fail(400, `This request is already ${rows[0].status}. It can no longer be changed.`);
  return rows[0];
};

exports.updateSelfAllocation = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const staffId = req.staff.user_id;
    const id = Number(req.params.id);
    const items = await cleanItems(connection, req.body.items);
    await connection.beginTransaction();
    await ownPending(connection, id, staffId);
    await connection.query("DELETE FROM app_self_allocation_items WHERE request_id = ?", [id]);
    await insertItems(connection, id, items);
    await connection.query("UPDATE app_self_allocations SET note = ?, updated_at = ? WHERE request_id = ?", [
      String(req.body.note || "").trim().slice(0, 255) || null, getISTTimestamp(), id,
    ]);
    await connection.commit();
    await appLog({ req, staffId, action: "self_allocation_edit", details: `Stock request ${id} changed` });
    res.json({ message: "Request updated" });
  } catch (error) {
    await connection.rollback();
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("App updateSelfAllocation error:", error);
    res.status(500).json({ message: "Could not update the request" });
  } finally {
    connection.release();
  }
};

exports.cancelSelfAllocation = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const staffId = req.staff.user_id;
    const id = Number(req.params.id);
    await connection.beginTransaction();
    await ownPending(connection, id, staffId);
    await connection.query("UPDATE app_self_allocations SET status = 'cancelled', updated_at = ? WHERE request_id = ?", [getISTTimestamp(), id]);
    await connection.commit();
    await appLog({ req, staffId, action: "self_allocation_cancel", details: `Stock request ${id} cancelled` });
    res.json({ message: "Request cancelled" });
  } catch (error) {
    await connection.rollback();
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("App cancelSelfAllocation error:", error);
    res.status(500).json({ message: "Could not cancel the request" });
  } finally {
    connection.release();
  }
};

// ---------------------------------------------------------------- office

// Requests waiting for checking (default) or a history view. `pending_count` always counts what is waiting.
exports.listSelfAllocations = async (req, res) => {
  try {
    const { status, staff_id: staffId, date } = req.body;
    const conditions = ["1 = 1"];
    const params = [];
    if (status && status !== "all") { conditions.push("r.status = ?"); params.push(String(status)); }
    else if (!status) { conditions.push("r.status = 'pending'"); }
    if (staffId) { conditions.push("r.staff_id = ?"); params.push(Number(staffId)); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) { conditions.push("r.alloc_date = ?"); params.push(date); }
    const requests = await loadRequests(pool, conditions.join(" AND "), params, true);
    const [[{ pending }]] = await pool.query("SELECT COUNT(*) AS pending FROM app_self_allocations WHERE status = 'pending'");
    res.json({ requests, pending_count: pending });
  } catch (error) {
    console.error("listSelfAllocations error:", error);
    res.status(500).json({ message: "Could not load the self allocations" });
  }
};

// The office checks (and may change) the quantities, then the real allocation is created and stock moves.
exports.verifySelfAllocation = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id = Number(req.body.request_id);
    const adminId = req.body.userId || null;
    if (!id) throw fail(400, "Choose a request");
    const items = await cleanItems(connection, req.body.items);

    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT *, DATE_FORMAT(alloc_date, '%Y-%m-%d') AS d FROM app_self_allocations WHERE request_id = ? FOR UPDATE", [id]);
    const request = rows[0];
    if (!request) throw fail(404, "Request not found");
    if (request.status !== "pending") throw fail(400, `This request is already ${request.status}.`);
    if (isTooOld(request.d)) {
      throw fail(400, `This request is for ${request.d}, more than ${MAX_BACKDATE_DAYS} days back. Reject it and allocate by hand.`);
    }

    // Stock is checked now, against what the store holds at this moment.
    const short = [];
    for (const i of items) {
      // product_id was checked to be an integer in cleanItems, so it is safe to put in the query text.
      const [[s]] = await connection.query(`SELECT ${CURRENT_STOCK_SQL(String(i.product_id))} AS available`);
      if (Number(s.available) < i.quantity) short.push(`${i.product_name} (asked ${i.quantity}, available ${Math.max(0, Number(s.available))})`);
    }
    if (short.length) throw fail(400, `Not enough stock in the store: ${short.join("; ")}. Lower the quantity or remove the product.`);

    const now = getISTTimestamp();
    for (const i of items) {
      await connection.query(
        `INSERT INTO daily_stock_allocation (marketing_staff_id, product_id, allocated_quantity, date, addedDate, isActive, converted_to_sales, addedBy, created)
         VALUES (?, ?, ?, ?, now(), 1, 0, ?, ?)`,
        [request.staff_id, i.product_id, i.quantity, request.d, adminId, now]
      );
    }

    // Keep what the phone asked for next to what the office approved; products the office added show requested 0.
    const [existing] = await connection.query("SELECT item_id, product_id FROM app_self_allocation_items WHERE request_id = ?", [id]);
    const approved = new Map(items.map((i) => [i.product_id, i.quantity]));
    for (const e of existing) {
      await connection.query("UPDATE app_self_allocation_items SET approved_qty = ? WHERE item_id = ?", [approved.get(e.product_id) || 0, e.item_id]);
      approved.delete(e.product_id);
    }
    for (const [productId, quantity] of approved) {
      await connection.query("INSERT INTO app_self_allocation_items (request_id, product_id, requested_qty, approved_qty) VALUES (?, ?, 0, ?)", [id, productId, quantity]);
    }
    await connection.query(
      "UPDATE app_self_allocations SET status = 'verified', verified_by = ?, verified_at = ?, updated_at = ?, admin_note = ? WHERE request_id = ?",
      [adminId, now, now, String(req.body.note || "").trim().slice(0, 255) || null, id]
    );
    await connection.commit();

    await logUserActivity({
      req, user_id: adminId,
      action: `Self allocation ${id} verified for staff ${request.staff_id} on ${request.d}: ${items.map((i) => `${i.product_name} x ${i.quantity}`).join(", ")}`.slice(0, 250),
      reference_type: "app_self_allocation", reference_id: id,
    });
    res.json({ message: `Allocated ${items.length} product(s)` });
  } catch (error) {
    await connection.rollback();
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("verifySelfAllocation error:", error);
    res.status(500).json({ message: `Could not verify the request: ${error.message}` });
  } finally {
    connection.release();
  }
};

exports.rejectSelfAllocation = async (req, res) => {
  try {
    const id = Number(req.body.request_id);
    const adminId = req.body.userId || null;
    const [result] = await pool.query(
      "UPDATE app_self_allocations SET status = 'rejected', verified_by = ?, verified_at = ?, updated_at = ?, admin_note = ? WHERE request_id = ? AND status = 'pending'",
      [adminId, getISTTimestamp(), getISTTimestamp(), String(req.body.note || "").trim().slice(0, 255) || null, id]
    );
    if (!result.affectedRows) throw fail(400, "This request is not waiting any more");
    await logUserActivity({
      req, user_id: adminId, action: `Self allocation ${id} rejected`, reference_type: "app_self_allocation", reference_id: id,
    });
    res.json({ message: "Request rejected" });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("rejectSelfAllocation error:", error);
    res.status(500).json({ message: "Could not reject the request" });
  }
};
