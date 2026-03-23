const pool = require("../config/db");

exports.getCashFlow = async (req, res) => {
  try {
    const { fromDate, toDate, page = 1, limit = 10 } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "From and To dates are required" });
    }
    const offset = (page - 1) * limit;
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
      `SELECT DateofTransaction AS date, NULL AS debit, TotalAmount AS credit, 'Sale' AS type, sale_tracking_Id, id
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
    const { fromDate, toDate, page, limit} = req.body;
console.log(req.body);
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: "From and To dates are required" });
    }
    const offset = (page - 1) * limit;
    //SALES PROFIT
    const query = `
    SELECT
        s.product_id,
        s.sale_date AS date,
        s.sale_tracking_Id AS saleTrackingId,
        SUM(s.quantity_sold) AS total_quantity_sold,
        SUM(s.quantity_sold * pp.purchase_price) AS total_purchase_cost,
        SUM(s.amount_received) AS total_amount_received,
        (SUM(s.amount_received) - SUM(s.quantity_sold * pp.purchase_price)) AS credit,
        'Sales Income' AS type
    FROM sales s
    INNER JOIN product_prices pp
        ON s.price_id = pp.price_id
    WHERE s.sale_date BETWEEN ? AND ?
      AND s.isActive = 1
GROUP BY s.product_id, s.sale_date, s.sale_tracking_Id
ORDER BY s.product_id, s.sale_date;
  `;
  const [profit] = await pool.query(query, [fromDate, toDate]);

      //SALES Loss
    const query1 = `
SELECT 
      s.product_id,
      s.sale_date AS date,
      s.sale_tracking_Id AS saleTrackingId,
      s.loss_count,
      pp.purchase_price,
      (s.loss_count * pp.purchase_price) AS debit,
      'Sales Loss' AS type
    FROM sales s
    JOIN product_prices pp 
      ON pp.price_id = s.price_id
    WHERE s.sale_date BETWEEN ? AND ?
      AND s.isActive = 1
      AND s.loss_count>0
    ORDER BY s.sale_date ASC
  `;

  const [salesLoss] = await pool.query(query1, [fromDate, toDate]);

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
       FROM Salary
       WHERE AddedDate BETWEEN ? AND ?`,
      [fromDate, toDate]
    );

    // FUEL EXPENSE (DEBIT)
    const [fuel] = await pool.query(
      `SELECT 
          DateofTransaction AS date,
          sale_tracking_Id AS saleTrackingId,
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
          sale_tracking_Id AS saleTrackingId, 
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
          sale_tracking_Id AS saleTrackingId,
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
      ...salesLoss,
      ...salesDamage,
      ...salary,
      ...fuel,
      ...vehicle,
      ...other
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    //console.log(allRecords);

    // calculate tiles (GLOBAL TOTALS)
const summary = allRecords.reduce(
  (acc, r) => {
    const debit = Number(r.debit || 0);
    const credit = Number(r.credit || 0);

    acc.totalDebit += debit;
    acc.totalCredit += credit;

    if (r.type === "Salary") acc.salaryExpense += debit;
    if (r.type === "Fuel Expense") acc.fuelExpense += debit;
    if (r.type === "Vehicle Expense") acc.vehicleExpense += debit;
    if (r.type === "Other Expense") acc.otherExpense += debit;
    if (r.type === "Sales Loss") acc.salesLostExpense += debit;
    if (r.type === "Sales Damaged") acc.salesDamagedExpense += debit;
    if (r.type === "Sales Income") acc.salesIncome += credit;

    return acc;
  },
  {
    salaryExpense: 0,
    fuelExpense: 0,
    vehicleExpense: 0,
    otherExpense: 0,
    salesLostExpense: 0,
    salesDamagedExpense: 0,
    salesIncome: 0,
    totalDebit: 0,
    totalCredit: 0
  }
);

summary.netProfit = summary.totalCredit - summary.totalDebit;

    
    const totalRecords = allRecords.length;
    const totalPages = Math.ceil(totalRecords / limit);

    const paginatedData = allRecords.slice(offset, offset + Number(limit));
    //res.json(allRecords);
    res.json({
      data: paginatedData,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: Number(page),
        limit: Number(limit)
      },
        summary
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
