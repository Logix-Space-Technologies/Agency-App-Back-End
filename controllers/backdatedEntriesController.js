const pool = require("../config/db");
const { getISTDate } = require("../utils/dateUtils");

// Lists entries whose business date is earlier than the day they were actually
// entered (created). Filtered by the day they were ENTERED, so "what was
// back-dated this week" is answered directly, however old the date used was.
exports.getBackdatedEntries = async (req, res) => {
  try {
    const today = getISTDate();
    const toDate = req.body.toDate || today;
    const fromDate =
      req.body.fromDate || getISTDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const params = [fromDate, toDate];

    const [allocations] = await pool.query(
      `SELECT d.daily_stock_id AS id,
              DATE_FORMAT(d.date, '%Y-%m-%d') AS entry_date,
              DATE_FORMAT(d.created, '%Y-%m-%d %H:%i:%s') AS created_at,
              DATEDIFF(DATE(d.created), d.date) AS days_back,
              u.name AS entered_by, p.product_name, s.name AS staff_name,
              d.allocated_quantity, d.isActive, d.converted_to_sales
       FROM daily_stock_allocation d
       JOIN products p ON p.product_id = d.product_id
       LEFT JOIN users s ON s.user_id = d.marketing_staff_id
       LEFT JOIN users u ON u.user_id = d.addedBy
       WHERE d.created IS NOT NULL AND d.date < DATE(d.created)
         AND DATE(d.created) BETWEEN ? AND ?`,
      params
    );

    // UserId is the staff member for marketing sales but the customer for
    // direct/wholesale ones, so the party name is picked by sale type.
    const [sales] = await pool.query(
      `SELECT x.id, x.invoiceNumber, x.TotalAmount, x.isActive,
              x.entry_date, x.created_at, x.days_back, x.sale_type,
              u.name AS entered_by,
              CASE WHEN x.sale_type = 'marketing' THEN su.name ELSE c.Name END AS party
       FROM (
         SELECT f.id, f.invoiceNumber, f.TotalAmount, f.isActive, f.UserId, f.addedBy,
                DATE_FORMAT(f.DateofTransaction, '%Y-%m-%d') AS entry_date,
                DATE_FORMAT(f.created, '%Y-%m-%d %H:%i:%s') AS created_at,
                DATEDIFF(DATE(f.created), f.DateofTransaction) AS days_back,
                (SELECT MIN(sl.sale_type) FROM sales sl WHERE sl.sale_tracking_id = f.sale_tracking_Id) AS sale_type
         FROM final_sale f
         WHERE f.created IS NOT NULL AND f.DateofTransaction < DATE(f.created)
           AND DATE(f.created) BETWEEN ? AND ?
       ) x
       LEFT JOIN users u ON u.user_id = x.addedBy
       LEFT JOIN users su ON su.user_id = x.UserId
       LEFT JOIN Customers c ON c.id = x.UserId`,
      params
    );

    const [purchases] = await pool.query(
      `SELECT pu.id, pu.Invoice_Number, pu.quantity, pu.total_amount, pu.isActive,
              DATE_FORMAT(pu.purchase_date, '%Y-%m-%d') AS entry_date,
              DATE_FORMAT(pu.created, '%Y-%m-%d %H:%i:%s') AS created_at,
              DATEDIFF(DATE(pu.created), DATE(pu.purchase_date)) AS days_back,
              u.name AS entered_by, p.product_name, sup.supplier_name
       FROM purchase pu
       JOIN products p ON p.product_id = pu.product_id
       LEFT JOIN suppliers sup ON sup.supplier_id = pu.supplier_id
       LEFT JOIN users u ON u.user_id = pu.addedBy
       WHERE pu.created IS NOT NULL AND DATE(pu.purchase_date) < DATE(pu.created)
         AND DATE(pu.created) BETWEEN ? AND ?`,
      params
    );

    const [vouchers] = await pool.query(
      `SELECT v.voucher_id AS id, v.description, v.amount, v.isActive,
              DATE_FORMAT(v.expense_date, '%Y-%m-%d') AS entry_date,
              DATE_FORMAT(v.created, '%Y-%m-%d %H:%i:%s') AS created_at,
              DATEDIFF(DATE(v.created), v.expense_date) AS days_back,
              u.name AS entered_by
       FROM misc_expense_vouchers v
       LEFT JOIN users u ON u.user_id = v.addedBy
       WHERE v.created IS NOT NULL AND v.expense_date < DATE(v.created)
         AND DATE(v.created) BETWEEN ? AND ?`,
      params
    );

    const status = (isActive) => (isActive ? "Active" : "Deleted");

    const rows = [
      ...allocations.map((r) => ({
        type: "Allocation",
        reference: `Allocation #${r.id}`,
        details: `${r.product_name} (qty ${r.allocated_quantity})`,
        party: r.staff_name,
        entry_date: r.entry_date,
        created_at: r.created_at,
        days_back: r.days_back,
        entered_by: r.entered_by,
        amount: null,
        status: r.isActive ? (r.converted_to_sales ? "Sold" : "Pending") : "Deleted",
      })),
      ...sales.map((r) => ({
        type: "Sale",
        reference: r.invoiceNumber || `Sale #${r.id}`,
        details: r.sale_type || "",
        party: r.party,
        entry_date: r.entry_date,
        created_at: r.created_at,
        days_back: r.days_back,
        entered_by: r.entered_by,
        amount: r.TotalAmount,
        status: status(r.isActive),
      })),
      ...purchases.map((r) => ({
        type: "Purchase",
        reference: r.Invoice_Number || `Purchase #${r.id}`,
        details: `${r.product_name} (qty ${r.quantity})`,
        party: r.supplier_name,
        entry_date: r.entry_date,
        created_at: r.created_at,
        days_back: r.days_back,
        entered_by: r.entered_by,
        amount: r.total_amount,
        status: status(r.isActive),
      })),
      ...vouchers.map((r) => ({
        type: "Expense",
        reference: `EXP-${String(r.id).padStart(5, "0")}`,
        details: r.description || "",
        party: null,
        entry_date: r.entry_date,
        created_at: r.created_at,
        days_back: r.days_back,
        entered_by: r.entered_by,
        amount: r.amount,
        status: status(r.isActive),
      })),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));

    res.json({ fromDate, toDate, data: rows });
  } catch (error) {
    console.error("Error fetching backdated entries:", error);
    res.status(500).json({ error: "Database error" });
  }
};
