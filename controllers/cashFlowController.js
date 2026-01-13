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
       FROM Salary
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


exports.fetchProfitLoss = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
console.log(req.body);
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "From and To dates are required" });
    }

    //SALES PROFIT
    const query = `
    SELECT
        s.product_id,
        s.sale_date AS date,
        SUM(s.quantity_sold) AS total_quantity_sold,
        SUM(s.quantity_sold * pp.purchase_price) AS total_purchase_cost,
        SUM(s.amount_received) AS total_amount_received,
        (SUM(s.amount_received) - SUM(s.quantity_sold * pp.purchase_price)) AS credit,
        'Sales Profit' AS type
    FROM sales s
    INNER JOIN product_prices pp
        ON s.price_id = pp.price_id
    WHERE s.sale_date BETWEEN ? AND ?
      AND s.isActive = 1
GROUP BY s.product_id, s.sale_date
ORDER BY s.product_id, s.sale_date;
  `;
  const [profit] = await pool.query(query, [fromDate, toDate]);

      //SALES Loss
    const query1 = `
SELECT 
      s.product_id,
      s.sale_date AS date,
      s.loss_count,
      pp.purchase_price,
      (s.loss_count * pp.purchase_price) AS debit,
      'Sales Lost' AS type
    FROM sales s
    JOIN product_prices pp 
      ON pp.price_id = s.price_id
    WHERE s.sale_date BETWEEN ? AND ?
      AND s.isActive = 1
      AND s.loss_count>0
    ORDER BY s.sale_date ASC
  `;

  const [salesLost] = await pool.query(query1, [fromDate, toDate]);

     /* 1. Total damaged & average selling price per product */

const query2 = `
SELECT
    sd.sale_date AS date,
    (
        (sd.total_damaged - COALESCE(fr.free_replacement_count, 0))
        * sd.selling_price
    ) AS debit,
    'Sales Damaged' AS type
FROM
(
    SELECT
        product_id,
        sale_date,
        SUM(damaged_count) AS total_damaged,
        SUM(amount_received) / NULLIF(SUM(quantity_sold), 0) AS selling_price
    FROM sales
    WHERE sale_date BETWEEN ? AND ?
      AND isActive = 1
    GROUP BY product_id, sale_date
) sd
LEFT JOIN
(
    SELECT
        product_id,
        SUM(quantity) AS free_replacement_count
    FROM purchase
    WHERE is_free_replacement = 1
      AND purchase_date BETWEEN ? AND ?
    GROUP BY product_id
) fr
ON fr.product_id = sd.product_id
WHERE (sd.total_damaged - COALESCE(fr.free_replacement_count, 0)) > 0
ORDER BY sd.product_id, sd.sale_date;

`;

const params = [
  fromDate, toDate,   // sales date range
  fromDate, toDate    // purchase date range
];

const [salesDamage] = await pool.query(query2, params);

    // SALARY (DEBIT)
    const [salary] = await pool.query(
      `SELECT 
          AddedDate AS date, 
          Amount AS debit, 
          NULL AS credit, 
          'Salary' AS type
       FROM salary
       WHERE AddedDate BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    // FUEL EXPENSE (DEBIT)
    const [fuel] = await pool.query(
      `SELECT 
          DateofTransaction AS date, 
          FuelExpenses AS debit, 
          NULL AS credit, 
          'Fuel Expense' AS type
       FROM final_sale
       WHERE isActive = 1 
         AND FuelExpenses > 0
         AND DateofTransaction BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    // VEHICLE EXPENSE (DEBIT)
    const [vehicle] = await pool.query(
      `SELECT 
          DateofTransaction AS date, 
          VehcileServiceExpenses AS debit, 
          NULL AS credit, 
          'Vehicle Expense' AS type
       FROM final_sale
       WHERE isActive = 1 
         AND VehcileServiceExpenses > 0
         AND DateofTransaction BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    // OTHER EXPENSE (DEBIT)
    const [other] = await pool.query(
      `SELECT 
          DateofTransaction AS date, 
          OtherExpenses AS debit, 
          NULL AS credit, 
          'Other Expense' AS type
       FROM final_sale
       WHERE isActive = 1 
         AND OtherExpenses > 0
         AND DateofTransaction BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    // MERGE + SORT
    const allRecords = [
      ...profit,
      ...salesLost,
      ...salesDamage,
      ...salary,
      ...fuel,
      ...vehicle,
      ...other
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    //console.log(allRecords);
    res.json(allRecords);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
