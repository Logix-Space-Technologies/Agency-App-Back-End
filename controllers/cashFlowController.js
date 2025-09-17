const pool = require("../config/db");

exports.getCashFlow = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "From and To dates are required" });
    }

    // Purchases (Debit)
    const [purchases] = await pool.query(
      `SELECT transaction_date AS date, total_amount AS debit, NULL AS credit, 'Purchase' AS type
       FROM purchase_settlement
       WHERE isActive = 1 AND transaction_date BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    // Salary (Debit)
    const [salaries] = await pool.query(
      `SELECT Date AS date, Amount AS debit, NULL AS credit, 'Salary' AS type
       FROM salary
       WHERE Date BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    // Sales (Credit)
    const [sales] = await pool.query(
      `SELECT DateofTransaction AS date, NULL AS debit, TotalAmount AS credit, 'Sale' AS type
       FROM final_sale
       WHERE isActive = 1 AND DateofTransaction BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    // Merge + sort
    const allRecords = [...purchases, ...salaries, ...sales].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.json(allRecords);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};