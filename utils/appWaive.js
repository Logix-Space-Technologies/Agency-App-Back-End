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

// The sidebar link "Credits & Waive-off" goes in the Reports group, with the same roles as View Credit.
// Added once; a link made by an earlier version in the wrong group or with admin-only roles is corrected.
const ensureMenuLink = async () => {
  const [viewRows] = await pool.query("SELECT parent_id, access_roles FROM menu_items WHERE href = '/view-credit' AND isActive = 1 LIMIT 1");
  const view = viewRows[0];
  const [reports] = await pool.query("SELECT id, menu_id FROM menu_items WHERE parent_id IS NULL AND isActive = 1 AND LOWER(TRIM(name)) = 'reports' LIMIT 1");
  const parentId = reports.length ? reports[0].id : view ? view.parent_id : null;
  if (!parentId) return;
  const [[parent]] = await pool.query("SELECT menu_id FROM menu_items WHERE id = ?", [parentId]);
  const roles = view && view.access_roles ? view.access_roles : "admin";
  const [have] = await pool.query("SELECT id, parent_id, access_roles FROM menu_items WHERE href = '/app-credits' LIMIT 1");
  if (!have.length) {
    await pool.query(
      "INSERT INTO menu_items (name, href, menu_id, parent_id, access_roles, isActive, sort_order) VALUES ('Credits & Waive-off', '/app-credits', ?, ?, ?, 1, 99)",
      [parent.menu_id, parentId, roles]
    );
  } else if (have[0].parent_id !== parentId || have[0].access_roles === "admin" && roles !== "admin") {
    await pool.query("UPDATE menu_items SET parent_id = ?, menu_id = ?, access_roles = ?, isActive = 1 WHERE id = ?", [parentId, parent.menu_id, roles, have[0].id]);
  }
};

// Started as soon as this file is loaded, so the table is there before the first dues query runs.
let ready = null;
const ensureWaiveTable = () => {
  if (!ready) ready = pool.query(CREATE_SQL)
    .then(() => pool.query("ALTER TABLE app_waive_offs ADD COLUMN tracking VARCHAR(40) DEFAULT NULL").catch((e) => { if (e.code !== "ER_DUP_FIELDNAME") throw e; }))
    .then(() => ensureMenuLink().catch((e) => console.error("waive-off menu link:", e.message)))
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

// What a salesperson owes the office for one app day: only the money to be handed over, never what shops still owe.
// Positive: short. Negative: handed over or paid more than due.
//   net, received - what had to be handed over at settlement, and what was
//   later         - taken afterwards in View Credit (Pay Now)
//   shopGiven     - credit the day's bills left with shops; Pay Now money up to this much, beyond the shortage,
//                   was for the shops' bills (older records), so it is not counted as paid extra
//   waived        - cash short the office waived off
const officeCredit = ({ net, received, later = 0, shopGiven = 0, waived = 0 }) => {
  const r2 = (n) => Math.round(n * 100) / 100;
  const short = r2(Number(net) - Number(received));
  const owed = short > 0 ? Math.max(0, r2(short - later - waived)) : short;
  const surplus = Math.max(0, r2(later + waived - Math.max(0, short)));
  return r2(owed - Math.max(0, r2(surplus - shopGiven)));
};

const officeCreditOfDay = (det, waived = 0) => officeCredit({
  net: det.handover.net_payable, received: (det.handover.received || {}).total, waived,
  later: (det.credit_payments || []).reduce((t, p) => t + Number(p.total || 0), 0),
  shopGiven: (det.invoices || []).reduce((t, i) => t + Number(i.credit || 0), 0),
});

module.exports = { ensureWaiveTable, CREATE_SQL, waivedShortByDay, officeCredit, officeCreditOfDay };
