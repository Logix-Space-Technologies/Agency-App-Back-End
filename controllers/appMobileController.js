const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { signToken, RENEW_AFTER_DAYS } = require("../middleware/appAuth");
const { appLog } = require("../utils/appLog");
const { getISTTimestamp, getISTDate } = require("../utils/dateUtils");

// A sold price this far from the current marketing price is flagged for the admin.
const PRICE_ALERT_PCT = Number(process.env.APP_PRICE_ALERT_PCT) || 10;

const APP_ROLES = ["marketing_staff", "staff"];

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

const validCoords = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// ---------------------------------------------------------------- auth

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Enter your username and password" });
    }

    const [rows] = await pool.query(
      `SELECT user_id, name, role, phone, email, password_hash, isBlocked
       FROM users
       WHERE (email = ? OR phone = ?) AND isActive = 1 AND role IN (?)`,
      [username, username, APP_ROLES]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Wrong username or password" });
    }
    // Checked after the password so a stranger cannot learn which logins exist or are blocked.
    if (user.isBlocked === 1) {
      return res.status(403).json({ message: "This login is blocked. Contact the office." });
    }

    await appLog({ req, staffId: user.user_id, action: "login", details: `${user.name} logged in` });
    res.json({
      token: signToken(user),
      user: { id: user.user_id, name: user.name, phone: user.phone, email: user.email },
    });
  } catch (error) {
    console.error("App login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

exports.me = async (req, res) => {
  const { user_id, name, phone, email, role } = req.staff;
  const body = { user: { id: user_id, name, phone, email }, priceAlertPct: PRICE_ALERT_PCT };
  const ageDays = (Date.now() / 1000 - (req.tokenIssuedAt || 0)) / 86400;
  if (ageDays > RENEW_AFTER_DAYS) body.token = signToken({ user_id, role });
  res.json(body);
};

exports.logout = async (req, res) => {
  await appLog({ req, staffId: req.staff.user_id, action: "logout", details: `${req.staff.name} logged out` });
  res.json({ message: "ok" });
};

// ---------------------------------------------------------------- routes and shops

const assignedRouteIds = async (staffId) => {
  const [rows] = await pool.query(
    `SELECT r.route_id FROM app_staff_routes sr
     JOIN app_routes r ON r.route_id = sr.route_id AND r.isActive = 1
     WHERE sr.staff_id = ? AND sr.isActive = 1`,
    [staffId]
  );
  return rows.map((r) => r.route_id);
};

exports.getRoutes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.route_id, r.route_name, r.area, r.description,
              (SELECT COUNT(*) FROM app_shops s WHERE s.route_id = r.route_id AND s.isActive = 1) AS shop_count
       FROM app_staff_routes sr
       JOIN app_routes r ON r.route_id = sr.route_id AND r.isActive = 1
       WHERE sr.staff_id = ? AND sr.isActive = 1
       ORDER BY r.route_name`,
      [req.staff.user_id]
    );
    res.json({ routes: rows });
  } catch (error) {
    console.error("App getRoutes error:", error);
    res.status(500).json({ message: "Could not load routes" });
  }
};

const SHOP_COLUMNS = `s.shop_id, s.route_id, r.route_name, s.shop_name, s.address, s.phone, s.owner_name,
  s.owner_phone, s.gst_number, s.latitude, s.longitude, s.location_source`;

exports.getShops = async (req, res) => {
  try {
    const routeIds = await assignedRouteIds(req.staff.user_id);
    if (routeIds.length === 0) return res.json({ shops: [] });

    const conditions = ["s.isActive = 1", "s.route_id IN (?)"];
    const params = [routeIds];
    if (req.query.route_id) {
      conditions.push("s.route_id = ?");
      params.push(Number(req.query.route_id));
    }
    if (req.query.q) {
      conditions.push("(s.shop_name LIKE ? OR s.phone LIKE ? OR s.owner_name LIKE ?)");
      const like = `%${req.query.q}%`;
      params.push(like, like, like);
    }

    const [rows] = await pool.query(
      `SELECT ${SHOP_COLUMNS}
       FROM app_shops s JOIN app_routes r ON r.route_id = s.route_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY s.shop_name`,
      params
    );
    res.json({ shops: rows });
  } catch (error) {
    console.error("App getShops error:", error);
    res.status(500).json({ message: "Could not load shops" });
  }
};

const readShopBody = (body) => {
  const text = (v, max) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);
  return {
    route_id: Number(body.route_id),
    shop_name: text(body.shop_name, 255),
    address: text(body.address, 1000),
    phone: text(body.phone, 20),
    owner_name: text(body.owner_name, 255),
    owner_phone: text(body.owner_phone, 20),
    gst_number: text(body.gst_number, 20),
    latitude: num(body.latitude),
    longitude: num(body.longitude),
    location_source: body.location_source === "map" ? "map" : "gps",
  };
};

const shopProblem = (s) => {
  if (!s.shop_name) return "Shop name is required";
  if (!s.address) return "Address is required";
  if (!s.phone) return "Shop phone is required";
  if (!s.owner_name) return "Owner name is required";
  if (!s.owner_phone) return "Owner phone is required";
  if (!validCoords(s.latitude, s.longitude)) return "Share the shop location from GPS or pick it on the map";
  return null;
};

exports.addShop = async (req, res) => {
  try {
    const shop = readShopBody(req.body);
    const problem = shopProblem(shop);
    if (problem) return res.status(400).json({ message: problem });

    const routeIds = await assignedRouteIds(req.staff.user_id);
    if (!routeIds.includes(shop.route_id)) {
      return res.status(403).json({ message: "This route is not assigned to you" });
    }

    const now = getISTTimestamp();
    const [result] = await pool.query(
      `INSERT INTO app_shops (route_id, shop_name, address, phone, owner_name, owner_phone, gst_number,
                              latitude, longitude, location_source, added_by, isActive, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [shop.route_id, shop.shop_name, shop.address, shop.phone, shop.owner_name, shop.owner_phone,
       shop.gst_number, shop.latitude, shop.longitude, shop.location_source, req.staff.user_id, now, now]
    );

    await appLog({
      req, staffId: req.staff.user_id, action: "shop_added",
      details: `Added shop ${shop.shop_name} (location by ${shop.location_source})`,
      latitude: shop.latitude, longitude: shop.longitude,
    });
    res.status(201).json({ shop_id: result.insertId });
  } catch (error) {
    console.error("App addShop error:", error);
    res.status(500).json({ message: "Could not save the shop" });
  }
};

exports.updateShop = async (req, res) => {
  try {
    const shopId = Number(req.params.id);
    const shop = readShopBody(req.body);
    const problem = shopProblem(shop);
    if (problem) return res.status(400).json({ message: problem });

    const routeIds = await assignedRouteIds(req.staff.user_id);
    const [existing] = await pool.query("SELECT route_id FROM app_shops WHERE shop_id = ? AND isActive = 1", [shopId]);
    if (!existing[0] || !routeIds.includes(existing[0].route_id) || !routeIds.includes(shop.route_id)) {
      return res.status(403).json({ message: "You cannot edit this shop" });
    }

    await pool.query(
      `UPDATE app_shops SET route_id = ?, shop_name = ?, address = ?, phone = ?, owner_name = ?, owner_phone = ?,
              gst_number = ?, latitude = ?, longitude = ?, location_source = ?, updated_at = ?
       WHERE shop_id = ?`,
      [shop.route_id, shop.shop_name, shop.address, shop.phone, shop.owner_name, shop.owner_phone,
       shop.gst_number, shop.latitude, shop.longitude, shop.location_source, getISTTimestamp(), shopId]
    );

    await appLog({
      req, staffId: req.staff.user_id, action: "shop_edited",
      details: `Edited shop ${shop.shop_name}`, latitude: shop.latitude, longitude: shop.longitude,
    });
    res.json({ message: "ok" });
  } catch (error) {
    console.error("App updateShop error:", error);
    res.status(500).json({ message: "Could not update the shop" });
  }
};

// ---------------------------------------------------------------- products

// Latest marketing selling price per product, the same price the web app uses for marketing staff.
const PRODUCT_SQL = `
  SELECT p.product_id, p.product_name, p.mrp, p.product_image, pp.price_id,
         pp.marketing_selling_price AS price
  FROM products p
  JOIN product_prices pp ON pp.price_id = (
    SELECT p2.price_id FROM product_prices p2
    WHERE p2.product_id = p.product_id AND p2.isActive = 1 AND p2.effective_date <= ?
    ORDER BY p2.effective_date DESC, p2.price_id DESC LIMIT 1
  )
  WHERE p.isActive = 1`;

exports.getProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(`${PRODUCT_SQL} ORDER BY p.product_name`, [getISTDate()]);
    res.json({ products: rows });
  } catch (error) {
    console.error("App getProducts error:", error);
    res.status(500).json({ message: "Could not load products" });
  }
};

// ---------------------------------------------------------------- invoices

const loadInvoice = async (invoiceId, staffId) => {
  const [rows] = await pool.query(
    `SELECT i.app_invoice_id, i.invoice_no, DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
            DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            i.total_amount, i.cash_amount, i.upi_amount, i.card_amount, i.credit_amount,
            i.price_diff_amount, i.max_price_diff_pct, i.price_flag, i.status, i.notes, i.reject_reason,
            i.shop_id, s.shop_name, s.address, s.phone, s.owner_name, s.gst_number,
            i.route_id, r.route_name, i.staff_id, u.name AS staff_name
     FROM app_invoices i
     JOIN app_shops s ON s.shop_id = i.shop_id
     LEFT JOIN app_routes r ON r.route_id = i.route_id
     JOIN users u ON u.user_id = i.staff_id
     WHERE i.app_invoice_id = ? AND i.staff_id = ?`,
    [invoiceId, staffId]
  );
  if (!rows[0]) return null;
  const [items] = await pool.query(
    `SELECT it.product_id, p.product_name, it.quantity, it.system_price, it.sold_price, it.line_total
     FROM app_invoice_items it JOIN products p ON p.product_id = it.product_id
     WHERE it.app_invoice_id = ? ORDER BY it.item_id`,
    [invoiceId]
  );
  return { ...rows[0], items };
};

exports.createInvoice = async (req, res) => {
  const staffId = req.staff.user_id;
  try {
    const { client_uuid, shop_id, items, payment = {}, notes, latitude, longitude } = req.body;

    if (client_uuid) {
      const [dup] = await pool.query(
        "SELECT app_invoice_id FROM app_invoices WHERE client_uuid = ? AND staff_id = ?",
        [client_uuid, staffId]
      );
      if (dup[0]) return res.json({ invoice: await loadInvoice(dup[0].app_invoice_id, staffId), duplicate: true });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Add at least one item" });
    }

    const routeIds = await assignedRouteIds(staffId);
    const [shopRows] = await pool.query(
      "SELECT shop_id, shop_name, route_id FROM app_shops WHERE shop_id = ? AND isActive = 1",
      [Number(shop_id)]
    );
    const shop = shopRows[0];
    if (!shop || !routeIds.includes(shop.route_id)) {
      return res.status(403).json({ message: "This shop is not on your routes" });
    }

    const today = getISTDate();
    const [priceRows] = await pool.query(`${PRODUCT_SQL}`, [today]);
    const prices = new Map(priceRows.map((p) => [p.product_id, p]));

    let total = 0;
    let diffAmount = 0;
    let maxPct = 0;
    const lines = [];
    const seen = new Set();
    for (const raw of items) {
      const productId = Number(raw.product_id);
      const quantity = Number(raw.quantity);
      const soldPrice = money(raw.price);
      const product = prices.get(productId);
      if (!product) return res.status(400).json({ message: "A product on the invoice is no longer available" });
      if (seen.has(productId)) return res.status(400).json({ message: `${product.product_name} is added twice` });
      seen.add(productId);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: `Enter a whole quantity for ${product.product_name}` });
      }
      if (!(soldPrice > 0)) {
        return res.status(400).json({ message: `Enter a price for ${product.product_name}` });
      }

      const systemPrice = money(product.price);
      const lineTotal = money(quantity * soldPrice);
      total = money(total + lineTotal);
      diffAmount = money(diffAmount + (soldPrice - systemPrice) * quantity);
      if (systemPrice > 0) {
        maxPct = Math.max(maxPct, Math.abs(soldPrice - systemPrice) / systemPrice * 100);
      }
      lines.push({ productId, quantity, systemPrice, soldPrice, lineTotal, priceId: product.price_id });
    }

    const cash = money(payment.cash);
    const upi = money(payment.upi);
    const card = money(payment.card);
    if (cash < 0 || upi < 0 || card < 0) return res.status(400).json({ message: "Payment cannot be negative" });
    const paid = money(cash + upi + card);
    if (paid > total + 0.005) return res.status(400).json({ message: "Payment is more than the invoice total" });
    const credit = money(total - paid);
    const flag = maxPct >= PRICE_ALERT_PCT ? 1 : 0;
    maxPct = Math.round(maxPct * 100) / 100;

    const lat = num(latitude);
    const lng = num(longitude);
    const geo = validCoords(lat, lng) ? [lat, lng] : [null, null];
    const compactDate = today.replace(/-/g, "");

    const connection = await pool.getConnection();
    let invoiceId = null;
    try {
      for (let attempt = 0; attempt < 5 && !invoiceId; attempt++) {
        await connection.beginTransaction();
        try {
          const [[{ n }]] = await connection.query(
            "SELECT COUNT(*) AS n FROM app_invoices WHERE staff_id = ? AND invoice_date = ?",
            [staffId, today]
          );
          const invoiceNo = `A${staffId}-${compactDate}-${String(n + 1 + attempt).padStart(3, "0")}`;

          const [inserted] = await connection.query(
            `INSERT INTO app_invoices
              (invoice_no, client_uuid, staff_id, shop_id, route_id, invoice_date, total_amount,
               cash_amount, upi_amount, card_amount, credit_amount, price_diff_amount, max_price_diff_pct,
               price_flag, status, notes, latitude, longitude, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
            [invoiceNo, client_uuid || null, staffId, shop.shop_id, shop.route_id, today, total,
             cash, upi, card, credit, diffAmount, maxPct, flag,
             notes ? String(notes).slice(0, 500) : null, geo[0], geo[1], getISTTimestamp()]
          );

          for (const l of lines) {
            await connection.query(
              `INSERT INTO app_invoice_items (app_invoice_id, product_id, price_id, quantity, system_price, sold_price, line_total)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [inserted.insertId, l.productId, l.priceId, l.quantity, l.systemPrice, l.soldPrice, l.lineTotal]
            );
          }
          await connection.commit();
          invoiceId = inserted.insertId;
        } catch (error) {
          await connection.rollback();
          if (error.code !== "ER_DUP_ENTRY") throw error;
          if (String(error.message).includes("uq_app_invoice_uuid")) {
            const [dup] = await pool.query(
              "SELECT app_invoice_id FROM app_invoices WHERE client_uuid = ? AND staff_id = ?",
              [client_uuid, staffId]
            );
            if (dup[0]) return res.json({ invoice: await loadInvoice(dup[0].app_invoice_id, staffId), duplicate: true });
          }
        }
      }
    } finally {
      connection.release();
    }

    if (!invoiceId) return res.status(500).json({ message: "Could not number the invoice. Try again." });

    const invoice = await loadInvoice(invoiceId, staffId);
    await appLog({
      req, staffId, action: "invoice_created",
      details: `Invoice ${invoice.invoice_no} for ${shop.shop_name}, total ${total}${flag ? ", price differs from latest" : ""}`,
      latitude: geo[0], longitude: geo[1],
    });
    res.status(201).json({ invoice });
  } catch (error) {
    console.error("App createInvoice error:", error);
    res.status(500).json({ message: "Could not create the invoice" });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const conditions = ["i.staff_id = ?"];
    const params = [req.staff.user_id];
    if (isDate(req.query.from)) { conditions.push("i.invoice_date >= ?"); params.push(req.query.from); }
    if (isDate(req.query.to)) { conditions.push("i.invoice_date <= ?"); params.push(req.query.to); }
    if (["pending", "settled", "rejected"].includes(req.query.status)) {
      conditions.push("i.status = ?");
      params.push(req.query.status);
    }
    if (req.query.shop_id) { conditions.push("i.shop_id = ?"); params.push(Number(req.query.shop_id)); }

    const [rows] = await pool.query(
      `SELECT i.app_invoice_id, i.invoice_no, DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
              DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
              i.total_amount, i.credit_amount, i.status, i.price_flag, s.shop_name
       FROM app_invoices i JOIN app_shops s ON s.shop_id = i.shop_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY i.app_invoice_id DESC LIMIT 300`,
      params
    );
    res.json({ invoices: rows });
  } catch (error) {
    console.error("App getInvoices error:", error);
    res.status(500).json({ message: "Could not load invoices" });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice = await loadInvoice(Number(req.params.id), req.staff.user_id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json({ invoice });
  } catch (error) {
    console.error("App getInvoice error:", error);
    res.status(500).json({ message: "Could not load the invoice" });
  }
};

// ---------------------------------------------------------------- reports

const pad = (n) => String(n).padStart(2, "0");

const periodRange = (period, date) => {
  const [y, m, d] = date.split("-").map(Number);
  if (period === "month") {
    const last = new Date(y, m, 0).getDate();
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}`, group: "%Y-%m-%d" };
  }
  if (period === "year") {
    return { from: `${y}-01-01`, to: `${y}-12-31`, group: "%Y-%m" };
  }
  return { from: `${y}-${pad(m)}-${pad(d)}`, to: `${y}-${pad(m)}-${pad(d)}`, group: "%Y-%m-%d" };
};

exports.getReport = async (req, res) => {
  try {
    const period = ["day", "month", "year"].includes(req.query.period) ? req.query.period : "day";
    const date = isDate(req.query.date) ? req.query.date : getISTDate();
    const { from, to, group } = periodRange(period, date);
    const staffId = req.staff.user_id;

    const [[totals]] = await pool.query(
      `SELECT COUNT(*) AS invoices, COALESCE(SUM(total_amount), 0) AS total,
              COALESCE(SUM(cash_amount), 0) AS cash, COALESCE(SUM(upi_amount), 0) AS upi,
              COALESCE(SUM(card_amount), 0) AS card, COALESCE(SUM(credit_amount), 0) AS credit,
              COALESCE(SUM(status = 'pending'), 0) AS pending, COALESCE(SUM(status = 'settled'), 0) AS settled
       FROM app_invoices
       WHERE staff_id = ? AND status <> 'rejected' AND invoice_date BETWEEN ? AND ?`,
      [staffId, from, to]
    );

    const [breakdown] = await pool.query(
      `SELECT DATE_FORMAT(invoice_date, ?) AS label, COUNT(*) AS invoices, SUM(total_amount) AS total
       FROM app_invoices
       WHERE staff_id = ? AND status <> 'rejected' AND invoice_date BETWEEN ? AND ?
       GROUP BY label ORDER BY label`,
      [group, staffId, from, to]
    );

    const [products] = await pool.query(
      `SELECT p.product_name, SUM(it.quantity) AS quantity, SUM(it.line_total) AS total
       FROM app_invoice_items it
       JOIN app_invoices i ON i.app_invoice_id = it.app_invoice_id
       JOIN products p ON p.product_id = it.product_id
       WHERE i.staff_id = ? AND i.status <> 'rejected' AND i.invoice_date BETWEEN ? AND ?
       GROUP BY p.product_id, p.product_name ORDER BY total DESC LIMIT 50`,
      [staffId, from, to]
    );

    res.json({ period, from, to, totals, breakdown, products });
  } catch (error) {
    console.error("App getReport error:", error);
    res.status(500).json({ message: "Could not load the report" });
  }
};

// ---------------------------------------------------------------- activity log

exports.postLog = async (req, res) => {
  try {
    const events = Array.isArray(req.body.events) ? req.body.events.slice(0, 50) : [];
    for (const e of events) {
      if (!e || !e.action) continue;
      const lat = num(e.latitude);
      const lng = num(e.longitude);
      await appLog({
        req, staffId: req.staff.user_id, action: String(e.action),
        details: e.details, latitude: validCoords(lat, lng) ? lat : null, longitude: validCoords(lat, lng) ? lng : null,
      });
    }
    res.json({ message: "ok" });
  } catch (error) {
    console.error("App postLog error:", error);
    res.status(500).json({ message: "Could not save the log" });
  }
};
