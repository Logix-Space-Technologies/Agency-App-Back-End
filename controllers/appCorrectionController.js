const pool = require("../config/db");
const { logUserActivity } = require("../utils/logUserActivity");
const { appLog } = require("../utils/appLog");
const { deletedByAdmin, statusExpr } = require("../utils/appInvoiceStatus");
const { getISTTimestamp } = require("../utils/dateUtils");

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const text = (v, max) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);
const fail = (status, message) => Object.assign(new Error(message), { status });

const REASONS = {
  duplicate: "Added twice",
  wrong_shop: "Wrong shop",
  wrong_items: "Wrong items or quantity",
  wrong_price: "Wrong price",
  not_delivered: "Goods not delivered",
  other: "Other",
};

// Created the first time it is needed, so nothing has to be run on the database by hand.
let ready = null;
const ensureTable = () => {
  if (!ready) {
    ready = pool.query(
      `CREATE TABLE IF NOT EXISTS app_invoice_corrections (
         correction_id INT NOT NULL AUTO_INCREMENT, invoice_id INT NOT NULL, staff_id INT NOT NULL,
         reason VARCHAR(40) NOT NULL, note VARCHAR(500) DEFAULT NULL, status VARCHAR(12) NOT NULL DEFAULT 'open',
         admin_note VARCHAR(500) DEFAULT NULL, handled_by INT DEFAULT NULL, handled_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL,
         PRIMARY KEY (correction_id), KEY idx_corr_invoice (invoice_id), KEY idx_corr_status (status, created_at)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ).catch((e) => { ready = null; throw e; });
  }
  return ready;
};

// What the phone shows on an invoice: the latest correction request and what the office did.
const latestForInvoice = async (db, invoiceId) => {
  try {
    const [rows] = await db.query(
      `SELECT correction_id, reason, note, status, admin_note,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at, DATE_FORMAT(handled_at, '%Y-%m-%d %H:%i:%s') AS handled_at
       FROM app_invoice_corrections WHERE invoice_id = ? ORDER BY correction_id DESC LIMIT 1`,
      [invoiceId]
    );
    return rows[0] ? { ...rows[0], reason_label: REASONS[rows[0].reason] || rows[0].reason } : null;
  } catch (e) {
    return null; // the table does not exist yet: nobody has reported anything
  }
};
exports.latestForInvoice = latestForInvoice;

// ---- phone

exports.report = async (req, res) => {
  try {
    await ensureTable();
    const staffId = req.staff.user_id;
    const invoiceId = Number(req.params.id);
    const reason = String(req.body.reason || "");
    if (!REASONS[reason]) return res.status(400).json({ message: "Choose what is wrong with the bill" });
    const note = text(req.body.note, 500);
    if (reason === "other" && !note) return res.status(400).json({ message: "Write what is wrong with the bill" });

    const [rows] = await pool.query(
      `SELECT i.app_invoice_id, i.invoice_no, i.total_amount, ${statusExpr("i")} AS status FROM app_invoices i WHERE i.app_invoice_id = ? AND i.staff_id = ?`,
      [invoiceId, staffId]
    );
    const inv = rows[0];
    if (!inv) return res.status(404).json({ message: "Invoice not found" });
    if (inv.status === "rejected" || inv.status === "deleted") return res.status(400).json({ message: "This bill is already removed" });
    const [[open]] = await pool.query("SELECT COUNT(*) AS n FROM app_invoice_corrections WHERE invoice_id = ? AND status = 'open'", [invoiceId]);
    if (open.n > 0) return res.status(400).json({ message: "You have already reported this bill. The office will look at it." });

    const [r] = await pool.query(
      "INSERT INTO app_invoice_corrections (invoice_id, staff_id, reason, note, created_at) VALUES (?, ?, ?, ?, ?)",
      [invoiceId, staffId, reason, note, getISTTimestamp()]
    );
    await appLog({ req, staffId, action: "bill_correction", details: `Reported ${inv.invoice_no} (${REASONS[reason]})${note ? `: ${note}` : ""}` });
    res.json({ message: "Reported to the office", correction: await latestForInvoice(pool, invoiceId), correction_id: r.insertId });
  } catch (error) {
    console.error("App report correction error:", error);
    res.status(500).json({ message: "Could not send the report" });
  }
};

// ---- office

const STATUS_FILTER = { open: "c.status = 'open'", done: "c.status = 'done'", dismissed: "c.status = 'dismissed'" };

exports.list = async (req, res) => {
  try {
    await ensureTable();
    const where = STATUS_FILTER[req.body.status] || "1 = 1";
    const [rows] = await pool.query(
      `SELECT c.correction_id, c.invoice_id, c.reason, c.note, c.status, c.admin_note,
              DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at, DATE_FORMAT(c.handled_at, '%Y-%m-%d %H:%i:%s') AS handled_at,
              u.name AS staff_name, h.name AS handled_by_name,
              i.invoice_no, DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date, i.total_amount, i.cash_amount, i.upi_amount, i.card_amount, i.credit_amount,
              ${statusExpr("i")} AS invoice_status, sh.shop_name
       FROM app_invoice_corrections c
       JOIN app_invoices i ON i.app_invoice_id = c.invoice_id
       JOIN app_shops sh ON sh.shop_id = i.shop_id
       LEFT JOIN users u ON u.user_id = c.staff_id
       LEFT JOIN users h ON h.user_id = c.handled_by
       WHERE ${where} ORDER BY (c.status = 'open') DESC, c.correction_id DESC LIMIT 300`
    );
    const [[{ open }]] = await pool.query("SELECT COUNT(*) AS open FROM app_invoice_corrections WHERE status = 'open'");
    res.json({ corrections: rows.map((r) => ({ ...r, reason_label: REASONS[r.reason] || r.reason })), open_count: Number(open) });
  } catch (error) {
    console.error("listCorrections error:", error);
    res.status(500).json({ message: "Could not load the reports" });
  }
};

exports.openCount = async (req, res) => {
  try {
    await ensureTable();
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM app_invoice_corrections WHERE status = 'open'");
    res.json({ open_count: Number(n) });
  } catch (error) {
    res.json({ open_count: 0 });
  }
};

exports.dismiss = async (req, res) => {
  try {
    await ensureTable();
    const note = text(req.body.admin_note, 500);
    if (!note) return res.status(400).json({ message: "Write a short reply for the salesperson" });
    const [r] = await pool.query(
      "UPDATE app_invoice_corrections SET status = 'dismissed', admin_note = ?, handled_by = ?, handled_at = ? WHERE correction_id = ? AND status = 'open'",
      [note, req.body.userId || null, getISTTimestamp(), Number(req.body.correction_id)]
    );
    if (!r.affectedRows) return res.status(400).json({ message: "This report is already handled" });
    await logUserActivity({ req, user_id: req.body.userId, action: `Bill report ${req.body.correction_id} dismissed: ${note}`, reference_type: "app_invoice_correction", reference_id: req.body.correction_id });
    res.json({ message: "Reply saved" });
  } catch (error) {
    console.error("dismissCorrection error:", error);
    res.status(500).json({ message: "Could not save the reply" });
  }
};

// Closes every open report on a bill once the office has dealt with it.
const closeFor = async (db, invoiceId, adminId, note) => {
  try {
    await db.query(
      "UPDATE app_invoice_corrections SET status = 'done', admin_note = ?, handled_by = ?, handled_at = ? WHERE invoice_id = ? AND status = 'open'",
      [note, adminId || null, getISTTimestamp(), invoiceId]
    );
  } catch (e) { /* no table, nothing to close */ }
};
exports.closeFor = closeFor;
exports.REASONS = REASONS;

// ---- delete a bill, even after its day was settled

// A pending bill is rejected. A settled bill is taken out of the books the same way Undo takes a whole day out,
// but only this bill: its pieces go back to stock, the sale and its payments leave the books, and the day's saved
// totals are lowered by the bill so the statement and the salesperson's balance stay true.
exports.deleteBill = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensureTable().catch(() => {});
    const invoiceId = Number(req.body.app_invoice_id);
    const adminId = req.body.userId || null;
    const reason = text(req.body.reason, 300);
    if (!invoiceId) throw fail(400, "Choose a bill");
    if (!reason) throw fail(400, "Write the reason for deleting this bill");

    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT app_invoice_id, invoice_no, staff_id, shop_id, status, final_sale_tracking_id, total_amount, cash_amount, upi_amount, card_amount,
              credit_amount, DATE_FORMAT(invoice_date, '%Y-%m-%d') AS invoice_date
       FROM app_invoices WHERE app_invoice_id = ? FOR UPDATE`,
      [invoiceId]
    );
    const inv = rows[0];
    if (!inv) throw fail(404, "Bill not found");
    if (inv.status === "rejected") throw fail(400, "This bill is already rejected");

    const [[{ later }]] = await connection.query("SELECT COALESCE(SUM(amount), 0) AS later FROM app_payment_allocations WHERE invoice_id = ?", [invoiceId]);
    if (Number(later) > 0) {
      throw fail(400, `Rs. ${money(later)} was collected against this bill later. Cancel that collection first, then delete the bill.`);
    }

    let note;
    if (inv.status === "pending") {
      await connection.query(
        "UPDATE app_invoices SET status = 'rejected', reject_reason = ?, settled_by = ?, settled_at = ? WHERE app_invoice_id = ? AND status = 'pending'",
        [reason, adminId, getISTTimestamp(), invoiceId]
      );
      note = "The bill was not settled yet, so it is rejected.";
    } else {
      const tracking = inv.final_sale_tracking_id;
      const [[gone]] = tracking ? await connection.query("SELECT COUNT(*) AS n FROM final_sale WHERE sale_tracking_Id = ? AND isActive = 0", [tracking]) : [[{ n: 0 }]];
      if (gone.n > 0) throw fail(400, "This bill was already deleted from the books.");
      try {
        const [ret] = await connection.query("SELECT 1 FROM direct_sale_return WHERE sale_tracking_Id = ? LIMIT 1", [tracking]);
        if (ret.length) throw fail(400, "This bill has a sales return. Remove the return first.");
      } catch (e) {
        if (e.status) throw e; // a database without the returns table has nothing to block on
      }

      // The settlement that carried this bill.
      const [sets] = await connection.query(
        "SELECT settlement_id, details FROM app_day_settlements WHERE staff_id = ? AND settle_date = ? AND invoice_count > 0 ORDER BY settlement_id DESC FOR UPDATE",
        [inv.staff_id, inv.invoice_date]
      );
      let settlement = null, d = null;
      for (const s of sets) {
        try {
          const det = JSON.parse(s.details);
          if (!det.undone && (det.invoices || []).some((x) => x.invoice_id === invoiceId)) { settlement = s; d = det; break; }
        } catch (e) { /* skip a record that cannot be read */ }
      }
      if (d && (d.invoices || []).length <= 1) {
        throw fail(400, "This is the only bill in that day's settlement. Use Undo settlement for the day instead.");
      }
      if (d && (d.credit_payments || []).length) {
        throw fail(400, "Money was already collected from the salesperson against that settlement in View Credit. Cancel that first.");
      }

      // 1. Stock comes back, the sale and its payments leave the books.
      const [lines] = await connection.query("SELECT product_id, quantity_sold FROM sales WHERE sale_tracking_Id = ? AND isActive = 1", [tracking]);
      for (const l of lines) {
        await connection.query("UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND isActive = 1", [l.quantity_sold, l.product_id]);
      }
      await connection.query("UPDATE sales SET isActive = 0 WHERE sale_tracking_Id = ?", [tracking]);
      await connection.query("DELETE FROM stock_History WHERE ReferenceInvoiceOrSale = ?", [tracking]);
      await connection.query("UPDATE sales_credit_history SET isActive = 0 WHERE sale_tracking_Id = ?", [tracking]);
      await connection.query("UPDATE final_sale SET isActive = 0 WHERE sale_tracking_Id = ?", [tracking]);
      await connection.query("UPDATE app_invoices SET reject_reason = ? WHERE app_invoice_id = ?", [reason, invoiceId]);

      // 2. The day's saved figures lose this bill.
      if (settlement && d) {
        const t = Number(inv.total_amount), c = Number(inv.cash_amount), u = Number(inv.upi_amount), k = Number(inv.card_amount), cr = Number(inv.credit_amount);
        const sub = (obj, key, v) => { if (obj && obj[key] !== undefined) obj[key] = money(Number(obj[key]) - v); };
        sub(d.totals, "total", t); sub(d.totals, "cash", c); sub(d.totals, "upi", u); sub(d.totals, "card", k); sub(d.totals, "credit", cr);
        if (d.handover) {
          sub(d.handover.expected, "cash", c); sub(d.handover.expected, "upi", u); sub(d.handover.expected, "card", k);
          sub(d.handover.expected, "total", c + u + k);
          sub(d.handover, "net_payable", c + u + k);
          d.handover.difference = money(Number((d.handover.received || {}).total || 0) - Number(d.handover.net_payable || 0));
        }
        const mine = d.invoices.find((x) => x.invoice_id === invoiceId);
        d.invoices = d.invoices.filter((x) => x.invoice_id !== invoiceId);
        d.removed_invoices = [...(d.removed_invoices || []), {
          invoice_id: invoiceId, invoice_no: inv.invoice_no, books_no: mine ? mine.books_no : null, shop_name: mine ? mine.shop_name : null,
          total: t, cash: c, upi: u, card: k, credit: cr, reason, at: getISTTimestamp(), by: adminId,
        }];
        await connection.query(
          `UPDATE app_day_settlements SET details = ?, invoice_count = invoice_count - 1, total_amount = total_amount - ?, cash_amount = cash_amount - ?,
                  upi_amount = upi_amount - ?, card_amount = card_amount - ?, credit_amount = credit_amount - ? WHERE settlement_id = ?`,
          [JSON.stringify(d), t, c, u, k, cr, settlement.settlement_id]
        );
        note = `The day's settlement (No. ${settlement.settlement_id}) now excludes it: total lowered by Rs. ${money(t)}, and Rs. ${money(c + u + k)} less is due from the salesperson.`;
        if (d.handover && d.handover.difference > 0.005) {
          note += ` The office had already received Rs. ${money(d.handover.difference)} more than is now due: give it back or keep it against the salesperson's next day.`;
        }
      } else {
        note = "The settlement record could not be found, so its saved totals were not changed.";
      }
    }

    await closeFor(connection, invoiceId, adminId, reason);
    await connection.commit();
    await logUserActivity({
      req, user_id: adminId, action: `App invoice ${inv.invoice_no} deleted by the office (${inv.status}): ${reason}`,
      reference_type: "app_invoice", reference_id: invoiceId,
    });
    res.json({ message: `Bill ${inv.invoice_no} deleted. ${note}`, was: inv.status });
  } catch (error) {
    await connection.rollback();
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("deleteBill error:", error);
    res.status(500).json({ message: `Could not delete the bill: ${error.message}` });
  } finally {
    connection.release();
  }
};
