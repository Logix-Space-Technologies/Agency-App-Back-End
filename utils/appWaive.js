const pool = require("../config/db");

// Every waive-off the office makes is kept here, one row per piece of credit it touches, and is never deleted:
// a wrong waive-off is Reversed (the row stays, marked), so the full story can be read later.
//   kind 'shop_dues'    - credit left with a shop on a bill (invoice_id). Counts as paid in the dues sums.
//   kind 'cash_short'   - money a salesperson did not hand over at a day settlement (settlement_id).
//   kind 'stock_charged'- stock charged to a salesperson at a day settlement, unpaid (settlement_id).
//   kind 'marketing_credit' - unpaid part of a marketing settlement bill (tracking).
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS app_waive_offs (
  waive_id INT NOT NULL AUTO_INCREMENT,
  batch_id VARCHAR(40) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  staff_id INT NOT NULL,
  shop_id INT DEFAULT NULL,
  invoice_id INT DEFAULT NULL,
  settlement_id INT DEFAULT NULL,
  tracking VARCHAR(40) DEFAULT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason VARCHAR(300) NOT NULL,
  created_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL,
  reversed TINYINT NOT NULL DEFAULT 0,
  reversed_by INT DEFAULT NULL,
  reversed_at DATETIME DEFAULT NULL,
  reverse_reason VARCHAR(300) DEFAULT NULL,
  PRIMARY KEY (waive_id),
  KEY idx_waive_invoice (invoice_id, kind, reversed),
  KEY idx_waive_staff (staff_id, kind),
  KEY idx_waive_settlement (settlement_id, kind, reversed),
  KEY idx_waive_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

// The sidebar link, placed in the same menu group as View Credit (Reports). Added once, never twice.
const MENU_SQL = `INSERT INTO menu_items (name, href, menu_id, parent_id, access_roles, isActive, sort_order)
SELECT 'Credits & Waive-off', '/app-credits', p.menu_id, p.id, 'admin', 1, 99
FROM menu_items c JOIN menu_items p ON p.id = c.parent_id
WHERE c.href = '/view-credit'
  AND NOT EXISTS (SELECT 1 FROM menu_items x WHERE x.href = '/app-credits')
LIMIT 1`;

// Started as soon as this file is loaded, so the table is there before the first dues query runs.
let ready = null;
const ensureWaiveTable = () => {
  if (!ready) ready = pool.query(CREATE_SQL)
    .then(() => pool.query("ALTER TABLE app_waive_offs ADD COLUMN tracking VARCHAR(40) DEFAULT NULL").catch((e) => { if (e.code !== "ER_DUP_FIELDNAME") throw e; }))
    .then(() => pool.query(MENU_SQL).catch((e) => console.error("waive-off menu link:", e.message)))
    .catch((e) => { ready = null; console.error("app_waive_offs table:", e.message); throw e; });
  return ready;
};
ensureWaiveTable().catch(() => {});

// Cash short already waived off, per settlement: { settlement_id: amount }. View Credit takes it off the day's credit.
const waivedShortByDay = async (db) => {
  try {
    const [rows] = await db.query("SELECT settlement_id, SUM(amount) AS amt FROM app_waive_offs WHERE kind = 'cash_short' AND reversed = 0 GROUP BY settlement_id");
    const m = {};
    for (const r of rows) m[r.settlement_id] = Number(r.amt);
    return m;
  } catch (e) { return {}; }
};

module.exports = { ensureWaiveTable, CREATE_SQL, waivedShortByDay };
