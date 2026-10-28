const crypto = require("crypto");
const pool = require("../config/db");
const { purgeOldAppLogs, RETENTION_DAYS } = require("../utils/appLog");
const { logUserActivity } = require("../utils/logUserActivity");
const { getISTTimestamp, getISTDate } = require("../utils/dateUtils");

const PRICE_ALERT_PCT = Number(process.env.APP_PRICE_ALERT_PCT) || 10;
const APP_ROLES = ["marketing_staff", "staff"];

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const text = (v, max) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);
const pageArgs = (body, defaultLimit = 25) => {
  const limit = Math.min(Math.max(Number(body.limit) || defaultLimit, 1), 200);
  const page = Math.max(Number(body.page) || 1, 1);
  return { limit, page, offset: (page - 1) * limit };
};
const trackingId = () => crypto.randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);

// ---------------------------------------------------------------- routes

exports.listRoutes = async (req, res) => {
  try {
    const q = text(req.body.q, 100);
    const params = [];
    let where = "r.isActive = 1";
    if (q) {
      where += " AND (r.route_name LIKE ? OR r.area LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }
    const [rows] = await pool.query(
      `SELECT r.route_id, r.route_name, r.area, r.description,
              DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
              (SELECT COUNT(*) FROM app_shops s WHERE s.route_id = r.route_id AND s.isActive = 1) AS shop_count,
              (SELECT GROUP_CONCAT(u.name ORDER BY u.name SEPARATOR ', ')
                 FROM app_staff_routes sr JOIN users u ON u.user_id = sr.staff_id AND u.isActive = 1
                 WHERE sr.route_id = r.route_id AND sr.isActive = 1) AS staff_names
       FROM app_routes r WHERE ${where} ORDER BY r.route_name`,
      params
    );
    res.json({ routes: rows });
  } catch (error) {
    console.error("listRoutes error:", error);
    res.status(500).json({ message: "Could not load routes" });
  }
};

exports.saveRoute = async (req, res) => {
  try {
    const { route_id, userId } = req.body;
    const name = text(req.body.route_name, 255);
    if (!name) return res.status(400).json({ message: "Route name is required" });

    const [dup] = await pool.query(
      "SELECT route_id FROM app_routes WHERE isActive = 1 AND route_name = ? AND route_id <> ?",
      [name, Number(route_id) || 0]
    );
    if (dup[0]) return res.status(409).json({ message: "A route with this name already exists" });

    if (route_id) {
      await pool.query(
        "UPDATE app_routes SET route_name = ?, area = ?, description = ? WHERE route_id = ? AND isActive = 1",
        [name, text(req.body.area, 255), text(req.body.description, 1000), route_id]
      );
      await logUserActivity({ req, user_id: userId, action: `Route ${name} is edited`, reference_type: "route", reference_id: route_id });
      return res.json({ message: "Route updated", route_id });
    }

    const [result] = await pool.query(
      "INSERT INTO app_routes (route_name, area, description, isActive, created_at, created_by) VALUES (?, ?, ?, 1, ?, ?)",
      [name, text(req.body.area, 255), text(req.body.description, 1000), getISTTimestamp(), userId || null]
    );
    await logUserActivity({ req, user_id: userId, action: `Route ${name} is added`, reference_type: "route", reference_id: result.insertId });
    res.status(201).json({ message: "Route added", route_id: result.insertId });
  } catch (error) {
    console.error("saveRoute error:", error);
    res.status(500).json({ message: "Could not save the route" });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    const { route_id, userId } = req.body;
    const [[{ shops }]] = await pool.query(
      "SELECT COUNT(*) AS shops FROM app_shops WHERE route_id = ? AND isActive = 1",
      [route_id]
    );
    if (shops > 0) {
      return res.status(400).json({ message: `This route has ${shops} shop(s). Move or delete them first.` });
    }
    await pool.query("UPDATE app_routes SET isActive = 0 WHERE route_id = ?", [route_id]);
    await pool.query("UPDATE app_staff_routes SET isActive = 0 WHERE route_id = ?", [route_id]);
    await logUserActivity({ req, user_id: userId, action: `Route ${route_id} is deleted`, reference_type: "route", reference_id: route_id });
    res.json({ message: "Route deleted" });
  } catch (error) {
    console.error("deleteRoute error:", error);
    res.status(500).json({ message: "Could not delete the route" });
  }
};

// ---------------------------------------------------------------- staff and route allocation

exports.listStaff = async (req, res) => {
  try {
    const q = text(req.body.q, 100);
    const params = [APP_ROLES];
    let where = "u.isActive = 1 AND u.role IN (?)";
    if (q) {
      where += " AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const [staff] = await pool.query(
      `SELECT u.user_id, u.name, u.role, u.phone, u.email, u.Place_Of_Allocation, u.isBlocked, u.profile_avathar,
              (SELECT DATE_FORMAT(MAX(l.created_at), '%Y-%m-%d %H:%i:%s') FROM app_activity_log l
                 WHERE l.staff_id = u.user_id AND l.action = 'login') AS last_login
       FROM users u WHERE ${where} ORDER BY u.name`,
      params
    );
    const [assignments] = await pool.query(
      `SELECT sr.staff_id, r.route_id, r.route_name
       FROM app_staff_routes sr JOIN app_routes r ON r.route_id = sr.route_id AND r.isActive = 1
       WHERE sr.isActive = 1 ORDER BY r.route_name`
    );
    const byStaff = {};
    for (const a of assignments) {
      (byStaff[a.staff_id] = byStaff[a.staff_id] || []).push({ route_id: a.route_id, route_name: a.route_name });
    }
    res.json({ staff: staff.map((s) => ({ ...s, routes: byStaff[s.user_id] || [] })) });
  } catch (error) {
    console.error("listStaff error:", error);
    res.status(500).json({ message: "Could not load staff" });
  }
};

// Replaces the full set of routes a staff member works on.
exports.setStaffRoutes = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { staff_id, route_ids, userId } = req.body;
    if (!staff_id || !Array.isArray(route_ids)) {
      return res.status(400).json({ message: "Staff and routes are required" });
    }
    const ids = [...new Set(route_ids.map(Number).filter(Boolean))];
    const now = getISTTimestamp();

    await connection.beginTransaction();
    await connection.query("UPDATE app_staff_routes SET isActive = 0 WHERE staff_id = ?", [staff_id]);
    for (const routeId of ids) {
      await connection.query(
        `INSERT INTO app_staff_routes (staff_id, route_id, isActive, assigned_at) VALUES (?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE isActive = 1, assigned_at = VALUES(assigned_at)`,
        [staff_id, routeId, now]
      );
    }
    await connection.commit();
    await logUserActivity({
      req, user_id: userId, action: `Routes of staff ${staff_id} set to ${ids.length} route(s)`,
      reference_type: "user", reference_id: staff_id,
    });
    res.json({ message: "Routes allocated" });
  } catch (error) {
    await connection.rollback();
    console.error("setStaffRoutes error:", error);
    res.status(500).json({ message: "Could not allocate routes" });
  } finally {
    connection.release();
  }
};

// ---------------------------------------------------------------- shops

const SHOP_SELECT = `
  s.shop_id, s.shop_name, s.address, s.phone, s.owner_name, s.owner_phone, s.gst_number,
  s.latitude, s.longitude, s.location_source, s.route_id, r.route_name, s.added_by, u.name AS added_by_name,
  DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') AS created_at`;

exports.listShops = async (req, res) => {
  try {
    const { route_id, staff_id } = req.body;
    const q = text(req.body.q, 100);
    const conditions = ["s.isActive = 1"];
    const params = [];
    if (route_id) { conditions.push("s.route_id = ?"); params.push(Number(route_id)); }
    if (staff_id) { conditions.push("s.added_by = ?"); params.push(Number(staff_id)); }
    if (q) {
      conditions.push("(s.shop_name LIKE ? OR s.phone LIKE ? OR s.owner_name LIKE ? OR s.owner_phone LIKE ? OR s.address LIKE ?)");
      params.push(...Array(5).fill(`%${q}%`));
    }
    const where = conditions.join(" AND ");
    const from = `FROM app_shops s JOIN app_routes r ON r.route_id = s.route_id LEFT JOIN users u ON u.user_id = s.added_by`;

    const { limit, page, offset } = pageArgs(req.body);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${from} WHERE ${where}`, params);
    const [rows] = await pool.query(
      `SELECT ${SHOP_SELECT} ${from} WHERE ${where} ORDER BY s.shop_name LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    // Map view: every matching shop that has a location, not just the current page.
    const [pins] = await pool.query(
      `SELECT s.shop_id, s.shop_name, s.latitude, s.longitude, s.phone, r.route_name
       ${from} WHERE ${where} AND s.latitude IS NOT NULL LIMIT 3000`,
      params
    );
    res.json({ shops: rows, total, page, limit, pins });
  } catch (error) {
    console.error("listShops error:", error);
    res.status(500).json({ message: "Could not load shops" });
  }
};

exports.saveShop = async (req, res) => {
  try {
    const b = req.body;
    const lat = b.latitude === "" || b.latitude == null ? null : Number(b.latitude);
    const lng = b.longitude === "" || b.longitude == null ? null : Number(b.longitude);
    if (!b.shop_id) return res.status(400).json({ message: "Shops are added from the mobile app" });
    if (!text(b.shop_name, 255)) return res.status(400).json({ message: "Shop name is required" });
    if ((lat !== null || lng !== null) && !(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) {
      return res.status(400).json({ message: "Location is not valid" });
    }
    await pool.query(
      `UPDATE app_shops SET route_id = ?, shop_name = ?, address = ?, phone = ?, owner_name = ?, owner_phone = ?,
              gst_number = ?, latitude = ?, longitude = ?, updated_at = ?
       WHERE shop_id = ? AND isActive = 1`,
      [Number(b.route_id), text(b.shop_name, 255), text(b.address, 1000), text(b.phone, 20), text(b.owner_name, 255),
       text(b.owner_phone, 20), text(b.gst_number, 20), lat, lng, getISTTimestamp(), b.shop_id]
    );
    await logUserActivity({ req, user_id: b.userId, action: `Shop ${b.shop_name} is edited`, reference_type: "shop", reference_id: b.shop_id });
    res.json({ message: "Shop updated" });
  } catch (error) {
    console.error("saveShop error:", error);
    res.status(500).json({ message: "Could not update the shop" });
  }
};

exports.deleteShop = async (req, res) => {
  try {
    const { shop_id, userId } = req.body;
    await pool.query("UPDATE app_shops SET isActive = 0, updated_at = ? WHERE shop_id = ?", [getISTTimestamp(), shop_id]);
    await logUserActivity({ req, user_id: userId, action: `Shop ${shop_id} is deleted`, reference_type: "shop", reference_id: shop_id });
    res.json({ message: "Shop deleted" });
  } catch (error) {
    console.error("deleteShop error:", error);
    res.status(500).json({ message: "Could not delete the shop" });
  }
};

// ---------------------------------------------------------------- activity log

exports.listLogs = async (req, res) => {
  try {
    const { staff_id, from, to, action } = req.body;
    const q = text(req.body.q, 100);
    const conditions = ["1 = 1"];
    const params = [];
    if (staff_id) { conditions.push("l.staff_id = ?"); params.push(Number(staff_id)); }
    if (isDate(from)) { conditions.push("l.created_at >= ?"); params.push(`${from} 00:00:00`); }
    if (isDate(to)) { conditions.push("l.created_at <= ?"); params.push(`${to} 23:59:59`); }
    if (action) { conditions.push("l.action = ?"); params.push(String(action)); }
    if (q) { conditions.push("(l.details LIKE ? OR l.action LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
    const where = conditions.join(" AND ");

    const { limit, page, offset } = pageArgs(req.body, 50);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM app_activity_log l WHERE ${where}`, params);
    const [rows] = await pool.query(
      `SELECT l.log_id, l.staff_id, u.name AS staff_name, l.action, l.details, l.latitude, l.longitude, l.device,
              DATE_FORMAT(l.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
       FROM app_activity_log l LEFT JOIN users u ON u.user_id = l.staff_id
       WHERE ${where} ORDER BY l.log_id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [actions] = await pool.query("SELECT DISTINCT action FROM app_activity_log ORDER BY action");
    res.json({ logs: rows, total, page, limit, actions: actions.map((a) => a.action), retentionDays: RETENTION_DAYS });
  } catch (error) {
    console.error("listLogs error:", error);
    res.status(500).json({ message: "Could not load the activity log" });
  }
};

exports.purgeLogs = async (req, res) => {
  try {
    const removed = await purgeOldAppLogs();
    res.json({ message: `Removed ${removed} entries older than ${RETENTION_DAYS} days`, removed });
  } catch (error) {
    console.error("purgeLogs error:", error);
    res.status(500).json({ message: "Could not clear old entries" });
  }
};

// ---------------------------------------------------------------- invoices and settlement

exports.listInvoices = async (req, res) => {
  try {
    const { from, to, staff_id, status, flaggedOnly } = req.body;
    const q = text(req.body.q, 100);
    const conditions = ["1 = 1"];
    const params = [];
    if (isDate(from)) { conditions.push("i.invoice_date >= ?"); params.push(from); }
    if (isDate(to)) { conditions.push("i.invoice_date <= ?"); params.push(to); }
    if (staff_id) { conditions.push("i.staff_id = ?"); params.push(Number(staff_id)); }
    if (["pending", "settled", "rejected"].includes(status)) { conditions.push("i.status = ?"); params.push(status); }
    if (flaggedOnly) conditions.push("i.price_flag = 1");
    if (q) { conditions.push("(i.invoice_no LIKE ? OR s.shop_name LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
    const where = conditions.join(" AND ");
    const from_ = `FROM app_invoices i
      JOIN app_shops s ON s.shop_id = i.shop_id
      JOIN users u ON u.user_id = i.staff_id
      LEFT JOIN app_routes r ON r.route_id = i.route_id`;

    const { limit, page, offset } = pageArgs(req.body);
    const [[summary]] = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(i.total_amount), 0) AS amount,
              COALESCE(SUM(i.status = 'pending'), 0) AS pending, COALESCE(SUM(i.price_flag = 1), 0) AS flagged,
              COALESCE(SUM(i.credit_amount), 0) AS credit
       ${from_} WHERE ${where}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT i.app_invoice_id, i.invoice_no, DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
              DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
              i.total_amount, i.cash_amount, i.upi_amount, i.card_amount, i.credit_amount,
              i.price_diff_amount, i.max_price_diff_pct, i.price_flag, i.status, i.system_invoice_number,
              i.staff_id, u.name AS staff_name, s.shop_name, r.route_name
       ${from_} WHERE ${where} ORDER BY i.app_invoice_id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ invoices: rows, summary, page, limit, priceAlertPct: PRICE_ALERT_PCT });
  } catch (error) {
    console.error("listInvoices error:", error);
    res.status(500).json({ message: "Could not load invoices" });
  }
};

exports.invoiceDetail = async (req, res) => {
  try {
    const id = Number(req.body.app_invoice_id);
    const [rows] = await pool.query(
      `SELECT i.*, DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
              DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
              DATE_FORMAT(i.settled_at, '%Y-%m-%d %H:%i:%s') AS settled_at,
              u.name AS staff_name, s.shop_name, s.address, s.phone, s.owner_name, s.owner_phone, s.gst_number,
              s.latitude AS shop_latitude, s.longitude AS shop_longitude, r.route_name
       FROM app_invoices i
       JOIN app_shops s ON s.shop_id = i.shop_id
       JOIN users u ON u.user_id = i.staff_id
       LEFT JOIN app_routes r ON r.route_id = i.route_id
       WHERE i.app_invoice_id = ?`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Invoice not found" });

    const [items] = await pool.query(
      `SELECT it.product_id, p.product_name, it.quantity, it.system_price, it.sold_price, it.line_total,
              COALESCE((SELECT SUM(st.quantity) FROM stock st WHERE st.product_id = it.product_id AND st.isActive = 1), 0) AS stock_now
       FROM app_invoice_items it JOIN products p ON p.product_id = it.product_id
       WHERE it.app_invoice_id = ? ORDER BY it.item_id`,
      [id]
    );
    const lines = items.map((it) => {
      const diff = Number((it.sold_price - it.system_price).toFixed(2));
      const pct = it.system_price > 0 ? Number(((diff / it.system_price) * 100).toFixed(2)) : 0;
      return { ...it, diff, diff_pct: pct, high_diff: Math.abs(pct) >= PRICE_ALERT_PCT, stock_after: it.stock_now - it.quantity };
    });
    res.json({ invoice: rows[0], items: lines, priceAlertPct: PRICE_ALERT_PCT });
  } catch (error) {
    console.error("invoiceDetail error:", error);
    res.status(500).json({ message: "Could not load the invoice" });
  }
};

// Posts one pending app invoice into the normal books (direct sale, stock debit, payments).
// This is the only place stock goes down for an app sale.
const settleOne = async (req, invoiceId, adminId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [invRows] = await connection.query(
      `SELECT *, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_text,
              DATE_FORMAT(invoice_date, '%Y-%m-%d') AS invoice_date_text
       FROM app_invoices WHERE app_invoice_id = ? FOR UPDATE`,
      [invoiceId]
    );
    const inv = invRows[0];
    if (!inv) throw new Error("Invoice not found");
    if (inv.status !== "pending") throw new Error(`Already ${inv.status}`);

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
        [inv.upi_amount, inv.cash_amount, inv.card_amount, tracking, Math.round(paid),
         inv.created_text]
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
      const [stockRows] = await connection.query(
        "SELECT stock_id FROM stock WHERE product_id = ? AND isActive = 1",
        [it.product_id]
      );
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
    await connection.commit();

    await logUserActivity({
      req, user_id: adminId, action: `App invoice ${inv.invoice_no} settled as ${invoiceNumber}`,
      reference_type: "sale", reference_id: tracking,
    });
    return { app_invoice_id: invoiceId, ok: true, invoiceNumber };
  } catch (error) {
    await connection.rollback();
    return { app_invoice_id: invoiceId, ok: false, message: error.message };
  } finally {
    connection.release();
  }
};

exports.settleInvoices = async (req, res) => {
  try {
    const { ids, userId } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Select at least one invoice" });
    }
    const results = [];
    for (const id of ids.slice(0, 200)) {
      results.push(await settleOne(req, Number(id), userId));
    }
    const done = results.filter((r) => r.ok).length;
    res.json({ message: `${done} of ${results.length} invoice(s) settled`, results });
  } catch (error) {
    console.error("settleInvoices error:", error);
    res.status(500).json({ message: "Could not settle the invoices" });
  }
};

exports.rejectInvoice = async (req, res) => {
  try {
    const { app_invoice_id, reason, userId } = req.body;
    const why = text(reason, 500);
    if (!why) return res.status(400).json({ message: "Enter a reason for rejecting" });
    const [result] = await pool.query(
      `UPDATE app_invoices SET status = 'rejected', reject_reason = ?, settled_by = ?, settled_at = ?
       WHERE app_invoice_id = ? AND status = 'pending'`,
      [why, userId || null, getISTTimestamp(), app_invoice_id]
    );
    if (result.affectedRows === 0) return res.status(400).json({ message: "Only pending invoices can be rejected" });
    await logUserActivity({ req, user_id: userId, action: `App invoice ${app_invoice_id} rejected: ${why}`, reference_type: "app_invoice", reference_id: app_invoice_id });
    res.json({ message: "Invoice rejected" });
  } catch (error) {
    console.error("rejectInvoice error:", error);
    res.status(500).json({ message: "Could not reject the invoice" });
  }
};
