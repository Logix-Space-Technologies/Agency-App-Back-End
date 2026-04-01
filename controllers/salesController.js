const { config } = require("dotenv");
const pool = require("../config/db");

const { v4: uuidv4 } = require("uuid");
const { getISTTimestamp, getISTDate } = require('../utils/dateUtils');
const { logUserActivity } = require("../utils/logUserActivity");

exports.fetchDailyDataForPrint = async (req, res) => {
  const { marketing_staff_id, date } = req.body;

  try {
    // Step 1: Get final sale data
    const [finalSalerows] = await pool.query(
      "SELECT `id`, `sale_tracking_Id`, `TotalAmount`, `UserId`, `DateofTransaction`, `isSettled`, `AmountPaid`, `FuelExpenses`, `VehcileServiceExpenses`, `OtherExpenses`, `name` FROM `final_sale` JOIN `users` ON `final_sale`.`addedBy` = `users`.`user_id`  WHERE `UserId` = ? AND `DateofTransaction` = ?",
      [marketing_staff_id, date]
    );

    // Check if sale data exists
    if (finalSalerows.length === 0) {
      return res.json({
        success: false,
        message: "No final sale found for given staff and date.",
      });
    }

    const saleTrackingId = finalSalerows[0].sale_tracking_Id; // Assume first record for simplicity

    // Step 2: Get product sale data
    const [productData] = await pool.query(
      `SELECT 
                s.sale_id, 
                s.sale_type, 
                s.marketing_staff_id, 
                p.product_name, 
                s.price_id, 
                s.quantity_sold, 
                s.amount_received, 
                s.is_credit, 
                s.sale_tracking_Id, 
                s.sale_date, 
                s.damaged_count, 
                s.is_settled, 
                s.loss_count, 
                s.isActive
            FROM 
                sales s
            JOIN 
                products p ON s.product_id = p.product_id
            WHERE 
                s.marketing_staff_id = ? AND s.sale_date = ?`,
      [marketing_staff_id, date]
    );

    // Step 3: Get payment breakdown (using sale_tracking_Id from above)
    const [transactionData] = await pool.query(
      "SELECT SUM(`amount`) AS total, SUM(`UPI`) AS upi, SUM(`Cash`) AS cash, SUM(`Card`) AS card FROM `sales_credit_history` WHERE `sale_tracking_Id` = ?",
      [saleTrackingId]
    );

    res.json({
      success: true,
      saledata: finalSalerows,
      details: productData,
      payments: transactionData[0] || {}, // handle no data scenario
    });
  } catch (error) {
    console.error("Error fetching daily data for print:", error);
    res.status(500).json({ success: false, message: "Failed to fetch data" });
  }
};

exports.cashReport = async (req, res) => {
  try {
    let { fromDate, toDate } = req.body;

    if (!fromDate) {
      return res
        .status(400)
        .json({ success: false, message: "fromDate is required" });
    }

    // If toDate is not given, treat it as a single-day range
    const startDateTime = fromDate + " 00:00:00";
    const endDateTime = (toDate || fromDate) + " 23:59:59";

    // 1. Credit repayments (UPI, Cash, Card)
    const [creditHistory] = await pool.query(
      `
            SELECT 
                SUM(UPI) AS totalUPI,
                SUM(Cash) AS totalCash,
                SUM(Card) AS totalCard
            FROM sales_credit_history
            WHERE isActive = 1
              AND creditedDate BETWEEN ? AND ?
        `,
      [startDateTime, endDateTime]
    );

    // 2. Final sale amounts and expenses
    const [finalSale] = await pool.query(
      `
            SELECT 
                SUM(AmountPaid) AS totalAmountPaid,
                SUM(FuelExpenses) AS totalFuelExpenses,
                SUM(VehcileServiceExpenses) AS totalServiceExpenses,
                SUM(OtherExpenses) AS totalOtherExpenses
            FROM final_sale
            WHERE isSettled = 1 AND isActive = 1 
              AND DateofTransaction BETWEEN ? AND ?
        `,
      [startDateTime, endDateTime]
    );

    // 3. Cash sales (non-credit)
    const [cashSales] = await pool.query(
      `
            SELECT 
                SUM(amount_received) AS totalAmountReceived
            FROM sales
            WHERE is_credit = 0 AND isActive = 1
              AND sale_date BETWEEN ? AND ?
        `,
      [startDateTime, endDateTime]
    );

    const report = {
      fromCreditHistory: {
        totalUPI: creditHistory[0].totalUPI || 0,
        totalCash: creditHistory[0].totalCash || 0,
        totalCard: creditHistory[0].totalCard || 0,
      },
      fromFinalSale: {
        totalAmountPaid: finalSale[0].totalAmountPaid || 0,
        totalFuelExpenses: finalSale[0].totalFuelExpenses || 0,
        totalServiceExpenses: finalSale[0].totalServiceExpenses || 0,
        totalOtherExpenses: finalSale[0].totalOtherExpenses || 0,
      },
      fromSales: {
        totalCashSaleReceived: cashSales[0].totalAmountReceived || 0,
      },
    };

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("Error generating cash report:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.incCredit = async (req, res) => {
  try {
    console.log(req.body);
    const { allocation_id, marketing_staff_id, payment } = req.body;
    const { cash, card, gpay } = payment;

    // Calculate total payment amount
    const totalAmount = cash + card + gpay;

    // 1. Update the final_sale table
    const updateQuery = `
            UPDATE final_sale 
            SET AmountPaid = AmountPaid + ? 
            WHERE id = ?
        `;

    await pool.query(updateQuery, [totalAmount, allocation_id]);

    // 2. Insert into sales_credit_history
    const insertQuery = `
            INSERT INTO sales_credit_history 
            (sale_tracking_Id, amount, creditedDate, isActive, UPI, Cash, Card) 
            VALUES (?, ?, NOW(), 1, ?, ?, ?)
        `;

    // Get sale_tracking_Id from final_sale
    const [saleData] = await pool.query(
      `
            SELECT sale_tracking_Id 
            FROM final_sale 
            WHERE id = ?
        `,
      [allocation_id]
    );

    if (!saleData || !saleData.length) {
      return res.status(404).json({ error: "Sale record not found" });
    }

    const saleTrackingId = saleData[0].sale_tracking_Id;

    await pool.query(insertQuery, [
      saleTrackingId,
      totalAmount,
      gpay, // UPI/GPay amount
      cash,
      card,
    ]);

    res.status(200).json({
      success: true,
      message: "Payment successfully recorded",
      allocation_id,
      total_payment: totalAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

exports.fecthAllCreditReportCustomers = async (req, res) => {
  const { customer_id, startDate, endDate, page = 1, limit = 15 } = req.body;

  //console.log(req.body);
  const offset = (page - 1) * limit;
    
  try {
        let dateFilter = "";
        const params = [customer_id];

        if (startDate && endDate) {
          dateFilter = " AND fs.DateofTransaction BETWEEN ? AND ? ";
          params.push(startDate, endDate);
        }

      //count
      const [countResult] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM final_sale fs
      JOIN (
        SELECT DISTINCT sale_tracking_Id
        FROM sales
        WHERE sale_type != 'marketing'
      ) s ON fs.sale_tracking_Id = s.sale_tracking_Id
      WHERE fs.UserId = ?
        AND fs.isActive = 1
        AND ((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) <> 0
        ${dateFilter}
      `,
      params
    );

    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);    
    
    //ResulTData
    const [rows] = await pool.query(
      `
    SELECT 
    fs.id, 
    s.sale_type, 
    CASE 
        WHEN s.sale_type = 'marketing' THEN u.name 
        ELSE c.Name 
    END AS name,
    fs.sale_tracking_Id, 
    fs.TotalAmount, 
    fs.UserId, 
    fs.DateofTransaction, 
    fs.isSettled, 
    fs.AmountPaid, 
    fs.FuelExpenses, 
    fs.VehcileServiceExpenses, 
    fs.OtherExpenses,
    (fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) AS finalAmount,
    (fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid AS credit
FROM 
    final_sale fs
JOIN 
    (
        SELECT sale_tracking_Id, MIN(sale_type) AS sale_type
        FROM sales
        GROUP BY sale_tracking_Id
    ) s ON fs.sale_tracking_Id = s.sale_tracking_Id AND s.sale_type != 'marketing' AND fs.isActive = 1 
LEFT JOIN 
    users u ON u.user_id = fs.UserId
LEFT JOIN 
    Customers c ON c.id = fs.UserId
WHERE 
    fs.UserId = ? AND fs.isActive = 1 
    AND (
        ((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) > 0
        OR ((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) < 0
    )
        ${dateFilter}
         ORDER BY fs.DateofTransaction DESC
         LIMIT ? OFFSET ?
        `,
       [...params, Number(limit), Number(offset)]
    );
    //credit summary
    let creditDateFilter = "";
    const creditParams = [customer_id];

    if (startDate && endDate) {
      creditDateFilter = " AND fs.DateofTransaction BETWEEN ? AND ? ";
      creditParams.push(startDate, endDate);
    }
    const [creditInfo] = await pool.query(
      `
SELECT 
    fs.UserId AS UserId,
    SUM(fs.TotalAmount) AS TotalAmount,
    SUM(fs.AmountPaid) AS TotalPaid,
    SUM((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) AS Credit
FROM 
    final_sale fs
JOIN 
    (
        SELECT DISTINCT sale_tracking_Id
        FROM sales
        WHERE sale_type != 'marketing'
    ) s ON fs.sale_tracking_Id = s.sale_tracking_Id
WHERE 
    fs.UserId = ? AND fs.isActive = 1 
    AND (
        ((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) <> 0
    )
        ${creditDateFilter}
GROUP BY 
    fs.UserId
        `,
      creditParams
    );

    res.json({
      success: true,
      data: rows,
      creditInfo : creditInfo,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching credit report:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch credit report" });
  }
};

exports.fecthAllCreditReportUser = async (req, res) => {
  const { marketing_staff_id, startDate, endDate, page = 1, limit = 15 } = req.body;

  console.log(req.body);
  const offset = (page - 1) * limit;
  try {
    let dateFilter = "";
    const params = [marketing_staff_id];
    if (startDate && endDate) {
      dateFilter = " AND fs.DateofTransaction BETWEEN ? AND ? ";
      params.push(startDate, endDate);
    }

    //count 
    
    /* ---------- TOTAL COUNT ---------- */
    const [countResult] = await pool.query(
      `
SELECT COUNT(*) AS total
FROM final_sale fs
JOIN (
    SELECT DISTINCT sale_tracking_Id
    FROM sales
    WHERE sale_type = 'marketing'
) s ON fs.sale_tracking_Id = s.sale_tracking_Id
WHERE fs.UserId = ?
  AND fs.isActive = 1
  AND (
      ((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) <> 0
  )
${dateFilter}
`,
      params
    );

    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);
    
    //resultSet
    const [rows] = await pool.query(
      `
    SELECT 
    fs.id, 
    s.sale_type, 
    CASE 
        WHEN s.sale_type = 'marketing' THEN u.name 
        ELSE c.Name 
    END AS name,
    fs.sale_tracking_Id, 
    fs.TotalAmount, 
    fs.UserId, 
    fs.DateofTransaction, 
    fs.isSettled, 
    fs.AmountPaid, 
    fs.FuelExpenses, 
    fs.VehcileServiceExpenses, 
    fs.OtherExpenses,
    (fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) AS finalAmount,
    (fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid AS credit
FROM 
    final_sale fs
JOIN 
    (
        SELECT sale_tracking_Id, MIN(sale_type) AS sale_type
        FROM sales
        GROUP BY sale_tracking_Id
    ) s ON fs.sale_tracking_Id = s.sale_tracking_Id AND s.sale_type = 'marketing'
LEFT JOIN 
    users u ON u.user_id = fs.UserId
LEFT JOIN 
    Customers c ON c.id = fs.UserId
WHERE 
    fs.UserId = ? AND fs.isActive = 1 
    AND (
        ((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) > 0
        OR ((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) < 0
    )
        ${dateFilter}
        ORDER BY fs.DateofTransaction DESC
        LIMIT ? OFFSET ?
        `,
      [...params, Number(limit), Number(offset)]
    );
    //crditINfo
    const creditParams = [marketing_staff_id];
    let creditDateFilter = "";

    if (startDate && endDate) {
      creditDateFilter = " AND fs.DateofTransaction BETWEEN ? AND ? ";
      creditParams.push(startDate, endDate);
    }
    const [creditInfo] = await pool.query(
      `
SELECT 
    fs.UserId AS UserId,
    SUM(fs.TotalAmount) AS TotalAmount,
    SUM(fs.AmountPaid) AS TotalPaid,
    SUM((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) AS Credit
FROM 
    final_sale fs
JOIN 
    (
        SELECT DISTINCT sale_tracking_Id
        FROM sales
        WHERE sale_type = 'marketing'
    ) s ON fs.sale_tracking_Id = s.sale_tracking_Id
WHERE 
    fs.UserId = ? AND fs.isActive = 1 
    AND (
        ((fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses)) - fs.AmountPaid) <> 0
    )
    ${creditDateFilter}
GROUP BY 
    fs.UserId
        `,
      creditParams
    );

   // res.json({ success: true, data: rows, creditInfo: creditInfo });
  
    res.json({
      success: true,
      data: rows,
      creditInfo: creditInfo,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error("Error fetching credit report:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch credit report" });
  }
};

exports.fecthAllCreditReport = async (req, res) => {
  const { fromDate, toDate } = req.body.params;

  console.log(req.body);

  if (!fromDate) {
    return res
      .status(400)
      .json({ success: false, message: "fromDate is required." });
  }

  const dateToUse = toDate || fromDate;

  try {
    const [rows] = await pool.query(
      `
            SELECT 
    fs.id, 
    s.sale_type, 
    CASE 
        WHEN s.sale_type = 'marketing' THEN u.name 
        ELSE c.Name 
    END AS name,
    fs.sale_tracking_Id, 
    fs.TotalAmount, 
    fs.UserId, 
    fs.DateofTransaction, 
    fs.isSettled, 
    fs.AmountPaid, 
    fs.FuelExpenses, 
    fs.VehcileServiceExpenses, 
    fs.OtherExpenses,
    (fs.TotalAmount - fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses) - fs.AmountPaid AS credit
FROM 
    final_sale fs
JOIN 
    (
        SELECT sale_tracking_Id, MIN(sale_type) AS sale_type
        FROM sales
        GROUP BY sale_tracking_Id
    ) s ON fs.sale_tracking_Id = s.sale_tracking_Id
LEFT JOIN 
    users u ON u.user_id = fs.UserId AND s.sale_type = 'marketing'
LEFT JOIN 
    Customers c ON c.id = fs.UserId AND s.sale_type != 'marketing'
WHERE 
    fs.DateofTransaction BETWEEN ? AND ? AND fs.isSettled=0 AND fs.isActive = 1 

        `,
      [fromDate, dateToUse]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching credit report:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch credit report" });
  }
};

exports.fecthAllCustomers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT `id`, `Name`, `Place`, `Mobile`, `EmailId` FROM `Customers` WHERE `isActive` = 1"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch customers" });
  }
};

exports.fecthLatestPrices = async (req, res) => {
  try {
    const [rows] = await pool.query(`
            SELECT 
                price_id, 
                product_id, 
                purchase_price, 
                commision_rate, 
                marketing_selling_price, 
                direct_selling_price, 
                whole_sale_price, 
                effective_date, 
                 cgst_percentage, 
                 sgst_percentage,
                  igst_percentage,
                 cess_percentage

                isActive 
            FROM product_prices 
            WHERE isActive = 1
        `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching product prices:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch product prices" });
  }
};

exports.addDirectSales = async (req, res) => {
  let connection;
  const { agency_id, employee_id, customer, products, totalAmount, saleType,payment_breakdown = {}, } =
    req.body;

  console.log(req.body);

  if (!agency_id || products.length === 0) {
    return res.status(400).json({ message: "Missing or invalid input" });
  }

  const { cash = 0, card = 0, upi = 0 } = payment_breakdown;


  const { id, name, place, mobile, email, date, invoiceNumber, amount_paying_now, gst_number } = customer;
  const sale_type = req.body.saleType;
  const current_date = new Date();
  const added_date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",  // GMT+5:30
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(current_date);

  connection = await pool.getConnection();

    // Convert amount_paying_now to number and handle empty/undefined cases
  const amountPayingNow = parseFloat(amount_paying_now || 0);

  const isSettledItem =
    parseFloat(amount_paying_now) >= parseFloat(totalAmount) ? 1 : 0;


  try {
    await connection.beginTransaction();

    // // 1. Insert or fetch customer
    // const [existingCustomer] = await connection.execute(
    //   `SELECT id FROM Customers WHERE Mobile = ?`,
    //   [mobile]
    // );
    if (!customer?.invoiceNumber) {
      throw new Error("Invoice number missing");
    }
    const [rows] = await connection.execute(
      "SELECT 1 FROM final_sale WHERE invoiceNumber = ? LIMIT 1",
      [customer?.invoiceNumber]
    );

    if (rows.length) {
      return res.status(400).json({ message: "Invoice number already exists" });
    }
    const gstValue = customer?.gst_number != null ? customer.gst_number : null;
    let customer_id;
    if(id){
      customer_id = id;
      const [customerUpdate] = await connection.execute(
        "UPDATE `Customers` SET `GstNumber`= ?  WHERE `id` = ?",
        [gstValue, customer_id]
      );  
    } else {
      const [customerResult] = await connection.execute(
        `INSERT INTO Customers (Name, Place, Mobile, EmailId, GstNumber, WalletAmount, addedBy, isActive)
                 VALUES (?, ?, ?, ?, ?, 0, ?, 1)`,
        [name, place, mobile, email, gstValue, employee_id]
      );
      customer_id = customerResult.insertId;
      await logUserActivity({
        req,
        user_id :employee_id,
        action: `Customer with name ${name} is added`
      });
    }
    const sale_tracking_id = generateUniqueSaleTrackingId();
    const isGstBilling = !!customer?.gst_number;

     const [insertResult]  = await connection.execute(
      `INSERT INTO final_sale ( sale_tracking_Id, invoiceNumber, TotalAmount, UserId, DateofTransaction, addedDate, isSettled, AmountPaid, isGstBilling, created, addedBy, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        sale_tracking_id,
        invoiceNumber,
        totalAmount,
        customer_id,
        date,
        added_date,
        isSettledItem,
        amountPayingNow,
        isGstBilling,
        getISTTimestamp(),
        employee_id
      ]
    );

    const [counterRows] = await connection.execute(
      "SELECT * FROM invoive_number_counter WHERE isActive = 1"
    );

    if (counterRows.length === 0) {
      throw new Error("Invoice counter row missing");
    }

    const counter = counterRows[0];

    if (isGstBilling) {
      // GST Billing → increment GST_counter
      const newGstCounter = (counter.GST_counter || 0) + 1;

      await connection.execute(
        `UPDATE invoive_number_counter 
        SET GST_counter = ?, modified = ?
        WHERE isActive = 1`,
        [newGstCounter, getISTTimestamp()]
      );

    } else {
      // Non-GST Billing → increment NGST_counter
      const newNgstCounter = (counter.NGST_counter || 0) + 1;

      await connection.execute(
        `UPDATE invoive_number_counter 
        SET NGST_counter = ?, modified = ?
        WHERE id = 1`,
        [newNgstCounter, getISTTimestamp()]
      );
    }
  //  commented on removing dynamic invoice number 
  //   const insertedId = insertResult.insertId;

  // // 2. UPDATE invoiceNumber
  //   const [updateResult] = await connection.execute(
  //     `UPDATE final_sale
  //     SET invoiceNumber = CONCAT(
  //         'SK',
  //         DATE_FORMAT(DateofTransaction, '%Y%m'),
  //         LPAD(id, 5, '0')
  //     )
  //     WHERE id = ?`,
  //     [insertedId]
  //   );

  //   if (updateResult.affectedRows === 0) {
  //   throw new Error("Invoice number update failed for ID " + insertedId);
  // }

  // const [finalSaleRecord] = await connection.execute(
  //     `SELECT invoiceNumber FROM final_sale WHERE sale_tracking_Id = ?`,
  //     [sale_tracking_id]
  //   );

     if (parseFloat(amountPayingNow) > 0) {
      await connection.execute(
        `INSERT INTO sales_credit_history (UPI, Cash, Card, sale_tracking_Id, amount, creditedDate, isActive)
                 VALUES (?,?,?,?, ?, now(), ?)`,
        [upi, cash, card, sale_tracking_id, amountPayingNow, 1]
      );
    }

    console.log("sales_credit_history Completed  !!! ");

    // await connection.execute(
    //   `INSERT INTO sales_credit_history (sale_tracking_Id, amount, creditedDate,isActive)
    //          VALUES (?, ?, ?, ?)`,
    //   [sale_tracking_id, amountPayingNow, date, 1]
    // );

    for (const item of products) {
      const { product_id, quantity,damaged_quantity,selling_price,isPriceChanged, price_id = null } = item;

      const [priceRows] = await connection.execute(
        `SELECT price_id, direct_selling_price, whole_sale_price
                 FROM product_prices
                 WHERE product_id = ? AND isActive = 1 AND effective_date <= ?
                 ORDER BY effective_date DESC LIMIT 1`,
        [product_id, date]
      );

      if (priceRows.length === 0) {
        console.warn(`No price found for product_id ${product_id}`);
        continue;
      }

      var marketing_selling_price = 0;

      //console.log(priceRows[0]);

      if (sale_type == "direct") {
        marketing_selling_price = priceRows[0].direct_selling_price;
      } else {
        marketing_selling_price = priceRows[0].whole_sale_price;
      }

      // 3. Calculate total amount
      //const amount__ = quantity * marketing_selling_price;
       const amount__ = (quantity * selling_price) - (damaged_quantity* selling_price);

      console.log(amount__);

      const price_id_ = priceRows[0].price_id;

      // Insert into `sales`
      const [salesResult] = await connection.execute(
        `INSERT INTO sales (
                    sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, 
                    is_credit, sale_tracking_Id, sale_date, damaged_count, is_settled, loss_count,is_price_changed, isActive
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
        [
          sale_type,
          employee_id,
          product_id,
          price_id_,
          quantity,
          amount__, // amount_received
          0, // is_credit
          sale_tracking_id, // sale_tracking_Id
          date,
          damaged_quantity, // damaged_count
          isSettledItem, // is_settled
          0, // loss_count
          isPriceChanged, // selling price edited or not
          1, // isActive
        ]
      );

      const sale_id = salesResult.insertId;

      console.log(sale_id);

      // Update stock
      await connection.execute(
        `UPDATE stock SET quantity = quantity - ?, Damage_Qty= Damage_Qty + ? WHERE  product_id = ?`,
        [quantity, damaged_quantity, product_id]
      );


      const [stockIdResult] = await connection.execute(
        "SELECT `stock_id` FROM `stock` WHERE `product_id` = ? AND `isActive` = 1",
        [product_id]
      );

      if (stockIdResult.length > 0) {
        const stock_Id = stockIdResult[0].stock_id;
        //const addedDate = new Date();
        const addedBy = req.user ? req.user.id : 0;
        const creditOrDebit = "debit";
        const referenceInvoiceOrSale = sale_tracking_id;

        await connection.execute(
          "INSERT INTO `stock_History`(`stock_Id`, `Qty`, `stock_type`, `AddedDate`, `AddedBy`, `CreditOrDebit`, `ReferenceInvoiceOrSale`) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            stock_Id,
            -quantity,
            "sale",
            added_date,
            addedBy,
            creditOrDebit,
            referenceInvoiceOrSale,
          ]
        );
      } else {
        console.warn(
          `No active stock found for product_id: ${product_id} and price_id: ${price_id_} to record in stock history.`
        );
      }
    }
    await logUserActivity({
        req,
        user_id :employee_id,
        action: `Sale created for the customer ${name}`
      });
    await connection.commit();
    //connection.release();

    res
      .status(201)
      //commented on removing dynamic invoice number
      //.json({ message: "Direct sales recorded with customer info",finalSaleRecord:finalSaleRecord });
      .json({ message: "Direct sales recorded with customer info"});
  } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message: "Invoice number already exists. Please refresh and try again."
      });
    }
    await connection.rollback();
    //connection.release();
    console.error("Error processing direct sale:", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    if (connection) connection.release();
  }
};

exports.getSaleDetails = async (req, res) => {
  try {
    const { sale_tracking_id } = req.params;
    if (!sale_tracking_id) {
      return res.status(400).json({ error: "Sale Tracking ID is required." });
    }

    const [salesDetails] = await pool.query(
      `
            SELECT
                s.sale_id,
                s.sale_type,
                u.name AS marketing_staff_name,
                p.product_name,
                p.product_id,
                pp.marketing_selling_price AS product_price,
                s.quantity_sold,
                s.amount_received,
                s.is_credit,
                s.sale_tracking_Id,
                s.sale_date,
                s.damaged_count,
                s.is_settled AS item_settled,
                s.loss_count,
                sch.amount AS credit_amount,
                sch.creditedDate AS credit_date
            FROM
                sales s
            JOIN
                users u ON s.marketing_staff_id = u.user_id
            JOIN
                products p ON s.product_id = p.product_id
            JOIN
                product_prices pp ON s.price_id = pp.price_id
            LEFT JOIN
                sales_credit_history sch ON s.sale_tracking_Id = sch.sale_tracking_Id AND sch.isActive = 1
            WHERE
                s.sale_tracking_Id = ?
            `,
      [sale_tracking_id]
    );

    if (salesDetails.length === 0) {
      return res.status(404).json({ message: "Sale details not found." });
    }

    res.json(salesDetails);
  } catch (error) {
    console.error("Error fetching sale details:", error);
    res.status(500).json({ error: "Database error" });
  }
};

// Fetch allocated quantity and price for product sale calculation
exports.getProductSaleMeta = async (req, res) => {
  try {
    const { product_id, marketing_staff_id, sale_date } = req.body;
    console.log("Request Body:", req.body);

    if (!product_id || !marketing_staff_id || !sale_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Fetch allocated quantity
    const [allocationRows] = await pool.query(
      `SELECT allocated_quantity 
             FROM daily_stock_allocation 
             WHERE product_id = ? AND marketing_staff_id = ? AND date = ? AND isActive = 1`,
      [product_id, marketing_staff_id, sale_date]
    );

    if (allocationRows.length === 0) {
      return res.status(404).json({ error: "No allocation found" });
    }

    const allocated_quantity = allocationRows[0].allocated_quantity;

    // 2. Fetch latest active marketing_selling_price
    const [priceRows] = await pool.query(
      `SELECT marketing_selling_price 
             FROM product_prices 
             WHERE product_id = ? AND isActive = 1 AND effective_date <= ?
             ORDER BY effective_date DESC LIMIT 1`,
      [product_id, sale_date]
    );

    if (priceRows.length === 0) {
      return res.status(404).json({ error: "No price data found" });
    }

    const marketing_selling_price = priceRows[0].marketing_selling_price;

    // 3. Calculate total amount
    const amount = allocated_quantity * marketing_selling_price;

    console.log("Allocated Qty:", allocated_quantity);
    console.log("Selling Price:", marketing_selling_price);
    console.log("Amount:", amount);

    res.json({
      allocated_quantity,
      marketing_selling_price,
      amount,
    });
  } catch (error) {
    console.error("Error in getProductSaleMeta:", error);
    res.status(500).json({ error: "Database error" });
  }
};

//view all
exports.getAllSales = async (req, res) => {
  try {
    const [sales] = await pool.query(
      "SELECT sale_id, sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count FROM sales WHERE isActive = 1"
    );
    res.json(sales);
  } catch (error) {
    console.error(error);

    res.status(500).json({ error: "Database error" });
  }
};

// Convert daily stock allocation to sales
// const { v4: uuidv4 } = require('uuid');
// Add Sales
exports.addSalesFromDailyAllocation = async (req, res) => {
  let connection;
  try {
    const {
      sale_type = "marketing",
      marketing_staff_id,
      sale_date = new Date(),
      products = [],
      amount_paid = 0,
      expenses = {}, // Destructure expenses
      payment_breakdown = {}, // Destructure payment breakdown
      user_id = ""
    } = req.body;

    console.log(req.body);

    // You can now access these like:
    const { fuel = 0, vehicle_service = 0, other = 0 } = expenses;
    const { cash = 0, card = 0, upi = 0 } = payment_breakdown;

    // GET CONNECTION
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (
      !marketing_staff_id ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    const [stockAllocations] = await connection.execute(
      `SELECT daily_stock_id, product_id, allocated_quantity
             FROM daily_stock_allocation
             WHERE marketing_staff_id = ? AND converted_to_sales = 0 AND isActive = 1`,
      [marketing_staff_id]
    );

    const allocationMap = {};
    for (const stock of stockAllocations) {
      allocationMap[stock.product_id] = stock;
    }

    const salesResults = [];

    const sale_tracking_id = generateUniqueSaleTrackingId();
    let totalAmountReceivedForSale = 0;
    const totalDeductions1 =
      parseFloat(fuel) + parseFloat(other) + parseFloat(vehicle_service);
    console.log("Products - 0");
    console.log(products[0].amount_received);

    const isSettledItem1 =
      amount_paid >= products[0].amount_received - totalDeductions1 ? 1 : 0;


    console.log({
      fuel,
      vehicle_service,
      other,
      sale_tracking_id,
      totalAmount: 0,
      marketing_staff_id,
      sale_date,
      isSettledItem1,
      amount_paid,
    });

      const current_date = new Date();
      const addedDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",  // GMT+5:30
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(current_date);

      const [counterRows] = await connection.execute(
        `SELECT NGST_prefix, NGST_counter, NGST_suffix 
        FROM invoive_number_counter 
        WHERE isActive = 1`
      );

      if (counterRows.length === 0) {
        throw new Error("Invoice counter not initialized");
      }

      const counterData = counterRows[0];

      const newCounter = counterData.NGST_counter + 1;

      const invoiceNumber = `${counterData.NGST_prefix}${String(newCounter).padStart(5, '0')}${counterData.NGST_suffix}`;

      await connection.execute(
        `UPDATE invoive_number_counter 
        SET NGST_counter = ?, modified = ?
        WHERE isActive = 1`,
        [newCounter, getISTTimestamp()]
      );

    const [insertResult] = await connection.execute(
      `INSERT INTO final_sale ( FuelExpenses, VehcileServiceExpenses, OtherExpenses, sale_tracking_Id, TotalAmount, UserId, DateofTransaction, addedDate, 
             isSettled, AmountPaid, created, addedBy, invoiceNumber)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fuel,
        vehicle_service,
        other,
        sale_tracking_id,
        0,
        marketing_staff_id,
        sale_date,
        addedDate,
        isSettledItem1,
        amount_paid,
        getISTTimestamp(),
        user_id,
        invoiceNumber
      ]
    );

    console.log("Final Sale Completed !!! ");

    if (parseFloat(amount_paid) > 0) {
      await connection.execute(
        `INSERT INTO sales_credit_history (UPI, Cash, Card, sale_tracking_Id, amount, creditedDate, isActive)
                 VALUES (?,?,?,?, ?, now(), ?)`,
        [upi, cash, card, sale_tracking_id, amount_paid, 1]
      );
    }

    console.log("sales_credit_history Completed  !!! ");

    for (const item of products) {
      console.log("Product loop  !!! ");
      console.log(item);

      const {
        product_id,
        dsa_id,
        quantity_sold = 0,
        amount_received = 0,
        damaged_count = 0,
        loss_count = 0,
      } = item;

      totalAmountReceivedForSale += parseFloat(amount_received);

      console.log("total AmountReceived For Sale" + totalAmountReceivedForSale);

      if (!allocationMap[product_id]) {
        console.log("No Product");
        console.warn(`No active allocation found for product_id ${product_id}`);
        continue;
      }

      console.log("quantity_sold" + quantity_sold);
      console.log(
        "quantity Allocated " + allocationMap[product_id].allocated_quantity
      );

      // if (quantity_sold > allocationMap[product_id].allocated_quantity) {
      //     console.log("quantity allocated     error " )

      //     return res.status(400).json({
      //         error: `Sold quantity (${quantity_sold}) exceeds allocated quantity (${allocationMap[product_id].allocated_quantity}) for product ID ${product_id}`
      //     });
      // }


      const [priceRows] = await connection.execute(
        `SELECT price_id
                 FROM product_prices
                 WHERE product_id = ? AND isActive = 1 AND effective_date <= ?
                 ORDER BY effective_date DESC LIMIT 1`,
        [product_id, sale_date]
      );

      console.log("product_prices fetch slect");

      if (priceRows.length === 0) {
        console.warn(`No price found for product_id ${product_id}`);
        continue;
      }

      const price_id = priceRows[0].price_id;

      // const totalDeductions = parseFloat(fuel) + parseFloat(other) + parseFloat(vehicle_service);

      // console.log("Deductions"+totalDeductions)
      // console.log("amount Received" + amount_received)
      // console.log("amount Total" + amount_paid)
      // const isSettledItem = amount_paid >= (amount_received - totalDeductions) ? 1 : 0;

      // console.log("Is Settled? " + isSettledItem);

      //const isSettledItem = parseFloat(amount_paid) >= parseFloat(amount_received) - (fuel+other+vehicle_service) ? 1 : 0;
      const isCredit =
        parseFloat(amount_paid) < parseFloat(amount_received) ? 1 : 0;

      console.log("Enter Into Sales !!! ");
      const [insertResult] = await connection.execute(
        `INSERT INTO sales
                 (sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count, sale_tracking_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale_type,
          marketing_staff_id,
          product_id,
          price_id,
          quantity_sold,
          amount_received,
          isCredit,
          sale_date,
          damaged_count,
          0,
          loss_count,
          sale_tracking_id,
        ]
      );

      const newSaleId = insertResult.insertId;
      console.log("New sale created with ID:", newSaleId);

      await connection.execute(
        `UPDATE stock
                 SET quantity = quantity - ? , Damage_Qty=Damage_Qty + ? , Loss_Qty = Loss_Qty + ?
                 WHERE product_id = ? AND isActive = 1`,
        [quantity_sold, damaged_count, loss_count, product_id]
      );

      const [stockIdResult] = await connection.execute(
        "SELECT `stock_id` FROM `stock` WHERE `product_id` = ? AND `price_id` = ? AND `isActive` = 1",
        [product_id, price_id]
      );

      if (stockIdResult.length > 0) {
        const stock_Id = stockIdResult[0].stock_id;
        //const addedDate = new Date();
        const addedBy = req.user ? req.user.id : 0;
        const creditOrDebit = "debit";
        const referenceInvoiceOrSale = newSaleId;

        await connection.execute(
          "INSERT INTO `stock_History`(`stock_Id`, `Qty`, `stock_type`, `AddedDate`, `AddedBy`, `CreditOrDebit`, `ReferenceInvoiceOrSale`) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            stock_Id,
            -quantity_sold,
            "sale",
            addedDate,
            addedBy,
            creditOrDebit,
            sale_tracking_id,
          ]
        );
      } else {
        console.warn(
          `No active stock found for product_id: ${product_id} and price_id: ${price_id} to record in stock history.`
        );
      }

      await connection.execute(
        `UPDATE daily_stock_allocation SET converted_to_sales = 1 , allocated_quantity = allocated_quantity-?  WHERE daily_stock_id = ?`,
        [quantity_sold, dsa_id]
      );

      salesResults.push({
        sale_id: newSaleId,
        product_id,
        quantity_sold,
        amount_received,
        sale_tracking_id,
      });
    }

    await connection.execute(
      `UPDATE final_sale
             SET TotalAmount = ?
             WHERE sale_tracking_Id = ?`,
      [totalAmountReceivedForSale, sale_tracking_id]
    );

    const [finalSaleRecord] = await connection.execute(
      `SELECT AmountPaid, TotalAmount, invoiceNumber FROM final_sale WHERE sale_tracking_Id = ?`,
      [sale_tracking_id]
    );

    if (finalSaleRecord.length > 0) {
      // const { AmountPaid, TotalAmount } = finalSaleRecord[0];
      // const totalDeductions = parseFloat(fuel) + parseFloat(other) + parseFloat(vehicle_service);
      // console.log("Deductions"+totalDeductions)
      // console.log("amount Received" + amount_received)
      // console.log("amount Total" + amount_paid)
      // const isSettledItemNew = amount_paid >= (amount_received - totalDeductions) ? 1 : 0;
    }
          await logUserActivity({
          req,
          user_id : user_id,
          action : `Sale created - ${marketing_staff_id}`
        });
        await connection.commit();
    res.json({ message: "Sales added successfully", sales: salesResults,finalSaleRecord: finalSaleRecord });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error in addSales:", error);
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) connection.release();
  }
};

function generateUniqueSaleTrackingId() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let saleId = "";
  for (let i = 0; i < 10; i++) {
    saleId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return saleId;
}

//add sales
exports.addSales = async (req, res) => {
  console.log("Function Called for Sales Entry");
  try {
    const {
      sale_type,
      marketing_staff_id,
      product_id,
      price_id,
      quantity_sold,
      amount_received,
      is_credit,
      sale_date,
      damaged_count,
      is_settled,
      loss_count,
    } = req.body;

    console.log("Request body:", req.body);

    if (!product_id || !price_id || quantity_sold === undefined) {
      console.log("Missing required fields");
      return res.status(400).json({ error: "Required fields are missing" });
    }

    // Insert sale
    const [saleResult] = await pool.query(
      `INSERT INTO sales (sale_type, marketing_staff_id, product_id, price_id, quantity_sold, 
             amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sale_type,
        marketing_staff_id,
        product_id,
        price_id,
        quantity_sold,
        amount_received,
        is_credit,
        sale_date,
        damaged_count,
        is_settled,
        loss_count,
      ]
    );

    const newSaleId = saleResult.insertId;
    console.log("New sale created with ID:", newSaleId);

    // Update stock
    console.log("Updating stock for product:", product_id, "price:", price_id);
    const [stockUpdateResult] = await pool.query(
      "UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND price_id = ? AND `isActive`=1",
      [quantity_sold, product_id, price_id]
    );

    console.log("Stock update affected rows:", stockUpdateResult.affectedRows);

    if (stockUpdateResult.affectedRows === 0) {
      console.log("Stock not found for update");
      return res
        .status(404)
        .json({ error: "Stock not found for the given product and price." });
    }

    // Get stock ID for history
    console.log("Fetching stock ID for history");
    const [stockIdResult] = await pool.query(
      "SELECT `stock_id` FROM `stock` WHERE `product_id` = ? AND `price_id` = ? AND `isActive` = 1",
      [product_id, price_id]
    );

    console.log("Stock ID query result:", stockIdResult);

    if (stockIdResult.length > 0) {
      const stock_Id = stockIdResult[0].stock_id;
      console.log("Found stock ID:", stock_Id, "for history entry");

      const addedDate = new Date();
      const addedBy = req.user ? req.user.id : null;
      const creditOrDebit = "debit";
      const referenceInvoiceOrSale = newSaleId;

      console.log("Inserting into stock_history with values:", {
        stock_Id,
        Qty: -quantity_sold,
        stock_type: "sale",
        addedDate,
        addedBy,
        creditOrDebit,
        referenceInvoiceOrSale,
      });

      try {
        const [historyResult] = await pool.query(
          "INSERT INTO `stock_History`(`stock_Id`, `Qty`, `stock_type`, `AddedDate`, `AddedBy`, `CreditOrDebit`, `ReferenceInvoiceOrSale`) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            stock_Id,
            -quantity_sold,
            "sale",
            addedDate,
            addedBy,
            creditOrDebit,
            referenceInvoiceOrSale,
          ]
        );
        console.log(
          "Stock history insert successful, ID:",
          historyResult.insertId
        );
      } catch (historyError) {
        console.error("Error inserting into stock_history:", historyError);
        throw historyError; // Re-throw to be caught by the outer catch
      }
    } else {
      console.warn(
        `No active stock found for product_id: ${product_id} and price_id: ${price_id} to record in stock history.`
      );
    }

    res.json({
      message: "Sale and stock updated successfully",
      sale_id: newSaleId,
    });
  } catch (error) {
    console.error("Error in addSales:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
};

// search
exports.searchSales = async (req, res) => {
  try {
    const { sale_date, from_date, to_date, user_type, user_id } = req.body;

     let subquery =  "";
     let nameField = "";
      if (user_type === "marketing") {
            subquery = `JOIN users u ON s.sale_type = 'marketing' AND f.UserId = u.user_id`;
            nameField = "u.name AS name";
      }
       else if (user_type === "customer") {
            subquery = `JOIN Customers c ON s.sale_type != 'marketing' AND f.UserId = c.id`;
            nameField = "c.Name AS name";
      }
       else if (user_type === "all") {
            subquery = `LEFT JOIN users u ON s.sale_type = 'marketing' AND f.UserId = u.user_id
                        LEFT JOIN Customers c ON s.sale_type != 'marketing' AND f.UserId = c.id`;
            nameField = `CASE WHEN s.sale_type = 'marketing' THEN u.name ELSE c.Name END AS name`;
      }


    let query = `
      SELECT
        f.id,
        f.sale_tracking_Id,
        f.TotalAmount,
        ${nameField},
        f.DateofTransaction,
        f.isSettled,
        f.AmountPaid,
        f.FuelExpenses,
        f.VehcileServiceExpenses,
        f.OtherExpenses,
        f.isGstBilling,
        s.sale_type
      FROM final_sale f
      JOIN (
        SELECT sale_tracking_Id, MAX(sale_type) AS sale_type
        FROM sales
        GROUP BY sale_tracking_Id
      ) s ON f.sale_tracking_Id = s.sale_tracking_Id ${subquery}
      WHERE f.isActive = 1
    `;

    const queryParams = [];

    // --- Date or Range filter ---
    if (sale_date) {
      query += ` AND DATE(f.DateofTransaction) = ?`;
      queryParams.push(sale_date);
    } else if (from_date && to_date) {
      query += ` AND DATE(f.DateofTransaction) BETWEEN ? AND ?`;
      queryParams.push(from_date, to_date);
    } else {
      return res.status(400).json({ error: "Please provide a sale date or a date range." });
    }

    // --- Optional User Filter ---
    if (user_type && user_type !== "all" && user_id && user_id !== "all") {
      if (user_type === "marketing") {
        query += ` AND s.sale_type = 'marketing' AND u.user_id = ?`;
        queryParams.push(user_id);
      } else if (user_type === "customer") {
        query += ` AND s.sale_type != 'marketing' AND c.id = ?`;
        queryParams.push(user_id);
      }
    }
    query += ` ORDER BY f.DateofTransaction DESC`;

    const [result] = await pool.query(query, queryParams);
    res.json(result);
  } catch (error) {
    console.error("Error searching sales:", error);
    res.status(500).json({ error: "Database error" });
  }
};

//delete
exports.deleteSales = async (req, res) => {
  try {
    const { sale_id } = req.body;
    if (!sale_id)
      return res.status(400).json({ error: "sales id is required" });

    const [result] = await pool.query(
      "UPDATE sales SET isActive = 0 WHERE sale_id= ?",
      [sale_id]
    );
    if (result.affectedRows === 0)
      return res.status(400).json({ error: "sales id not found" });
    res.json({ message: "sales id deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

//view all allocation by date
exports.fetchFinalSaleListBySearchValue = async (req, res) => {
  try {
    const { date, user } = req.body;
    // console.log(req.body);
    const queryParams = [];
    let query =
      "SELECT FS.id, FS.sale_tracking_Id, U.name, FS.DateofTransaction, FS.invoiceNumber, FS.TotalAmount, FS.isSettled " +
      "FROM `final_sale` as FS " +
      "JOIN `sales` as S ON FS.`sale_tracking_Id` = S.sale_tracking_Id " +
      "JOIN `users` as U ON FS.`UserId` = U.`user_id` " +
      "WHERE" +
      " ";
    if (date) {
      query +=
        "FS.DateofTransaction= ? AND S.sale_type='marketing' AND FS.isActive = 1 " +
        "GROUP BY FS.sale_tracking_Id, FS.id, U.name, FS.TotalAmount, FS.isSettled ORDER BY U.name ASC";
      queryParams.push(date);
    } else if (user) {
      query +=
        "U.name= ? AND S.sale_type='marketing' AND FS.isActive = 1 " +
        "GROUP BY FS.sale_tracking_Id, FS.id, U.name, FS.TotalAmount, FS.isSettled ORDER BY FS.DateofTransaction DESC";
      queryParams.push(user);
    }

    const [sales] = await pool.query(query, queryParams);
    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

//fetch data for with allocation ID - final sale -ID
exports.fetchSalesDataForPrintByID = async (req, res) => {
  try {
    let { allocationID } = req.body;
    // Step 1: Get final sale data
    const [finalSalerows] = await pool.query(
      "SELECT `id`, `sale_tracking_Id`, `TotalAmount`, `UserId`, `DateofTransaction`, `isSettled`, `AmountPaid`, `FuelExpenses`, `VehcileServiceExpenses`, `OtherExpenses`, `invoiceNumber`, COALESCE(`users`.`name`, 'Admin') as addedBy  FROM `final_sale` LEFT JOIN `users` ON `final_sale`.`addedBy` = `users`.`user_id` WHERE   `id` = ? AND `final_sale`.`isActive` = 1",
      [allocationID]
    );

    // Check if sale data exists
    if (finalSalerows.length === 0) {
      return res.json({
        success: false,
        message: "No final sale found for given date.",
      });
    }

    const saleTrackingId = finalSalerows[0].sale_tracking_Id; // Assume first record for simplicity

    // Step 2: Get product sale data
    const [productData] = await pool.query(
      `SELECT 
                s.sale_id, 
                s.sale_type, 
                s.marketing_staff_id, 
                p.product_name,
                p.product_id,
                pp.marketing_selling_price, 
                s.quantity_sold, 
                s.amount_received, 
                s.is_credit, 
                s.sale_tracking_Id, 
                s.sale_date, 
                s.damaged_count, 
                s.is_settled, 
                s.loss_count, 
                s.isActive,
                fs.id  AS final_sale_id,
                u.name
            FROM 
                sales s
            JOIN 
                products p ON s.product_id = p.product_id
            JOIN 
                product_prices pp ON pp.price_id = s.price_id    
            JOIN
                final_sale fs ON s.sale_tracking_Id = fs.sale_tracking_Id
            JOIN 
                users u ON s.marketing_staff_id = u.user_id        
            WHERE 
                 fs.id = ?  AND s.isActive = 1 AND fs.isActive = 1`,
      [allocationID]
    );

    // Step 3: Get payment breakdown (using sale_tracking_Id from above)
    const [transactionData] = await pool.query(
      "SELECT SUM(`amount`) AS total, SUM(`UPI`) AS upi, SUM(`Cash`) AS cash, SUM(`Card`) AS card FROM `sales_credit_history` WHERE `sale_tracking_Id` = ?",
      [saleTrackingId]
    );

    res.json({
      success: true,
      saledata: finalSalerows,
      details: productData,
      payments: transactionData[0] || {}, // handle no data scenario
    });
  } catch (error) {
    console.error("Error fetching daily data:", error);
    res.status(500).json({ success: false, message: "Failed to fetch data" });
  }
};

//view all allocation by date
exports.fetchDirectSaleListByDate = async (req, res) => {
  try {
    const { date, user } = req.body;
    console.log(`Searching for date: ${date}`);
    console.log(`Searching for user: ${user}`);
    const queryParams = [];
    if (date) {
      // 1. First check raw data exists
      const [testCount] = await pool.query(
        `SELECT COUNT(*) as count FROM final_sale WHERE DateofTransaction = ?`,
        [date]
      );
      console.log(`Raw records for ${date}:`, testCount[0].count);

      // 2. Check join conditions
      const [joinTest] = await pool.query(
        `SELECT 
         FS.id as fs_id, 
         FS.sale_tracking_Id,
         FS.DateofTransaction, 
         S.sale_tracking_Id as s_tracking_id,
         S.sale_type,
         C.Name
       FROM final_sale FS
       LEFT JOIN sales S ON FS.sale_tracking_Id = S.sale_tracking_Id
       LEFT JOIN Customers C ON FS.UserId = C.id
       WHERE FS.DateofTransaction = ? AND FS.isActive = 1
       LIMIT 5`,
        [date]
      );
      console.log("Join test samples:", joinTest);
    }
    // 3. Run modified main query

    let query = `SELECT 
    FS.id, 
    FS.sale_tracking_Id,
    FS.invoiceNumber,
    FS.DateofTransaction,  
    C.Name, 
    FS.TotalAmount, 
    FS.isSettled,
    S.sale_type
FROM sales S
JOIN final_sale FS ON S.sale_tracking_Id = FS.sale_tracking_Id
LEFT JOIN Customers C ON FS.UserId = C.id
WHERE`;

    if (date) {
      query += ` DATE(FS.DateofTransaction) = ?
    AND S.sale_type != 'marketing' AND FS.isActive = 1
GROUP BY FS.sale_tracking_Id, FS.id, C.Name, FS.TotalAmount, FS.isSettled, S.sale_type  ORDER BY C.Name ASC`;
      queryParams.push(date);
    } else if (user) {
      query += `  C.Name = ?
    AND S.sale_type != 'marketing' AND FS.isActive = 1
GROUP BY FS.sale_tracking_Id, FS.id, C.Name, FS.TotalAmount, FS.isSettled, S.sale_type ORDER BY FS.DateofTransaction DESC`;
      queryParams.push(user);
    }

    const [sales] = await pool.query(query, queryParams);

    //     const [sales] = await pool.query(
    //       `SELECT
    //     FS.id,
    //     FS.sale_tracking_Id,
    //     C.Name,
    //     FS.TotalAmount,
    //     FS.isSettled,
    //     S.sale_type
    // FROM sales S
    // JOIN final_sale FS ON S.sale_tracking_Id = FS.sale_tracking_Id
    // LEFT JOIN Customers C ON FS.UserId = C.id
    // WHERE DATE(FS.DateofTransaction) = ?
    //     AND S.sale_type != 'marketing'
    // GROUP BY FS.sale_tracking_Id, FS.id, C.Name, FS.TotalAmount, FS.isSettled, S.sale_type`,
    //       [date]
    //     );

    console.log(`Found ${sales.length} records`);
    res.json(sales);
  } catch (error) {
    console.error("Error in fetchDirectSaleListByDate:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
};

exports.fetchDirectSalesDataForPrintByID = async (req, res) => {
  try {
    let { allocationID } = req.body;
    console.log(allocationID);
    // Step 1: Get final sale data
    const [finalSalerows] = await pool.query(
      "SELECT FS.`id`, `sale_tracking_Id`, `TotalAmount`, `UserId`,  DATE_FORMAT(FS.DateofTransaction, '%Y-%m-%d') AS DateofTransaction, `isSettled`, `AmountPaid`, isGstBilling, customerGstNumber, C.Name, C.Place, C.Mobile, C.GstNumber, invoiceNumber, COALESCE(U.name, 'Admin') AS AddedBy FROM final_sale FS JOIN Customers C ON FS.UserId = C.id LEFT JOIN users U ON FS.addedBy = U.user_id WHERE  FS.`id` = ? AND FS.isActive = 1",
      [allocationID]
    );

    // Check if sale data exists
    if (finalSalerows.length === 0) {
      return res.json({
        success: false,
        message: "No final sale found for given date.",
      });
    }

    const saleTrackingId = finalSalerows[0].sale_tracking_Id; // Assume first record for simplicity

    // Step 2: Get product sale data
    const [productData] = await pool.query(
      `SELECT 
                s.sale_id, 
                s.sale_type, 
                s.marketing_staff_id,
                p.product_id, 
                p.product_name,
                p.mrp,
                p.hsn_code, 
                pp.marketing_selling_price,
                pp.direct_selling_price,
                pp.whole_sale_price,
                pp.cgst_percentage,
                pp.sgst_percentage,
                pp.igst_percentage,
                pp.cess_percentage, 
                s.quantity_sold, 
                s.amount_received, 
                s.is_credit, 
                s.sale_tracking_Id, 
                s.sale_date, 
                s.damaged_count, 
                s.is_settled, 
                s.loss_count, 
                s.isActive
            FROM 
                sales s
            JOIN 
                products p ON s.product_id = p.product_id
            JOIN 
                product_prices pp ON pp.price_id = s.price_id    
            JOIN
                final_sale fs ON s.sale_tracking_Id = fs.sale_tracking_Id   
            WHERE 
                 fs.id = ? AND s.isActive = 1 AND fs.isActive = 1`,
      [allocationID]
    );

    // Step 3: Get payment breakdown (using sale_tracking_Id from above)
    const [transactionData] = await pool.query(
      "SELECT SUM(`amount`) AS total, SUM(`UPI`) AS upi, SUM(`Cash`) AS cash, SUM(`Card`) AS card FROM `sales_credit_history` WHERE `sale_tracking_Id` = ?",
      [saleTrackingId]
    );

    // Step 3: Get return data if any (using sale_tracking_Id from above)
    const [returnData] = await pool.query(
    `SELECT 
    dsr.direct_sale_return_id,
    dsr.sale_tracking_Id,
    dsr.invoice_no,
    dsr.product_id,
    p.product_name,
    dsr.returned_quantity,
    dsr.return_amount,
    dsr.damaged_refund_quantity,
    dsr.damaged_refund_amount,
    dsr.damaged_replacement_quantity,
    dsr.date,
    dsr.added_by
    FROM direct_sale_return dsr
    JOIN products p 
    ON dsr.product_id = p.product_id WHERE sale_tracking_Id = ?`,
      [saleTrackingId]
    );


    res.json({
      success: true,
      saledata: finalSalerows,
      details: productData,
      payments: transactionData[0] || {}, // handle no data scenario
      returnData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

exports.submitAllProductReturns = async (req, res) => {
  const { items } = req.body;
  console.log(req.body);
  let connection;
  let returnData = [];
  let returnTableQuery = "";
  let queryParams = [];
  let amtToBeToReduced = 0;
  let qtyToBeToReduced = 0;



  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (items && items.length) {
      let invoice = items[0]?.invoice_no;
      [returnData] = await pool.query(
        `SELECT * FROM  direct_sale_return  WHERE invoice_no = ?`,
        [invoice]
      );
    }

    if (returnData && returnData.length > 0) {
      returnTableQuery = `UPDATE direct_sale_return SET 
      returned_quantity = returned_quantity + ?, return_amount = return_amount +?,
      damaged_refund_quantity = damaged_refund_quantity +?, damaged_refund_amount = damaged_refund_amount +?,
      damaged_replacement_quantity = damaged_replacement_quantity + ?,
      date = NOW(),added_by=? WHERE product_id = ? AND invoice_no = ?`;
    } else {
      returnTableQuery = `INSERT INTO direct_sale_return (
          invoice_no,
          product_id,
          returned_quantity,
          return_amount,
          damaged_refund_quantity,
          damaged_refund_amount,
          damaged_replacement_quantity,
          date,
          added_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?,NOW(), ?)`;
    }

    for (const item of items) {
      const {
        invoice_no,
        product_id,
        returned_quantity,
        damaged_refund_quantity,
        damaged_replacement_quantity,
        return_amount,
        damaged_refund_amount,
        added_by,
      } = item;

      queryParams= [];

      if (
        returned_quantity > 0 ||
        damaged_refund_quantity > 0 ||
        damaged_replacement_quantity > 0
      ) {
        if (returnData && returnData.length > 0) {
          queryParams.push(returned_quantity,
            return_amount,
            damaged_refund_quantity,
            damaged_refund_amount,
            damaged_replacement_quantity,
            added_by,product_id, invoice_no);
        } else {
          queryParams.push(
            invoice_no,
            product_id,
            returned_quantity,
            return_amount,
            damaged_refund_quantity,
            damaged_refund_amount,
            damaged_replacement_quantity,
            added_by
          );
        }
      
        await connection.execute(returnTableQuery, queryParams);

        // await connection.execute(
        //   `INSERT INTO direct_sale_return (
        //   invoice_no,
        //   product_id,
        //   returned_quantity,
        //   return_amount,
        //   damaged_refund_quantity,
        //   damaged_refund_amount,
        //   damaged_replacement_quantity,
        //   date,
        //   added_by
        // ) VALUES (?, ?, ?, ?, ?, ?, ?,NOW(), ?)`,
        //   [
        //     invoice_no,
        //     product_id,
        //     returned_quantity,
        //     return_amount,
        //     damaged_refund_quantity,
        //     damaged_refund_amount,
        //     damaged_replacement_quantity,
        //     added_by,
        //   ]
        // );
      }

      if (returned_quantity > 0) {
        await connection.execute(
          `UPDATE stock SET quantity = quantity + ? WHERE product_id = ?`,
          [returned_quantity, product_id]
        );
      }
      if (damaged_refund_quantity > 0 || damaged_replacement_quantity > 0) {
        let damaged_count =
          damaged_refund_quantity + damaged_replacement_quantity;
        await connection.execute(
          `UPDATE stock SET Damage_Qty = Damage_Qty + ? WHERE product_id = ?`,
          [damaged_count, product_id]
        );
      }
      if (damaged_replacement_quantity > 0) {
        await connection.execute(
          `UPDATE stock SET quantity = quantity - ? WHERE product_id = ?`,
          [damaged_replacement_quantity, product_id]
        );
      }
      // if eturn quantity > 0 or damage_refund_qty >0 , reduce the total mt from sale table-amt recived.
       if (returned_quantity > 0 || damaged_refund_quantity > 0 ) {
        qtyToBeToReduced =  (returned_quantity ?? 0) + (damaged_refund_quantity ?? 0);
        amtToBeToReduced =   (return_amount ?? 0) + (damaged_refund_amount ?? 0);
        await connection.execute(
          `UPDATE sales SET quantity_sold = quantity_sold - ?, amount_received = amount_received - ? WHERE product_id = ? AND sale_tracking_Id= ?`,
          [qtyToBeToReduced, amtToBeToReduced, product_id, invoice_no]
        );
        await connection.execute(
          `UPDATE final_sale SET TotalAmount = TotalAmount - ? WHERE  sale_tracking_Id= ?`,
          [amtToBeToReduced, invoice_no]
        );

       }
    }
    await connection.commit();
    res
      .status(200)  
      .json({ message: "Returns and stock updated successfully." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.log(error);
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) connection.release();
  }
};


  exports.getSaleDetailsForReturn = async (req, res) => {
    try {
      const { sale_tracking_id, type } = req.params;
      //console.log(req.params);
      if (!sale_tracking_id) {
        return res.status(400).json({ error: "Sale Tracking ID is required." });
      }
      if (!type) {
        return res.status(400).json({ error: "Sale Type is required." });
      }

      const [salesDetails] = await pool.query(
        `
              SELECT
                  s.sale_id,
                  s.sale_type,
                  u.name AS marketing_staff_name,
                  p.product_name,
                  p.product_id,
                  p.hsn_code,
                  pp.direct_selling_price AS product_price,
                  s.quantity_sold,
                  s.amount_received,
                  s.is_credit,
                  s.sale_tracking_Id,
                  s.sale_date,
                  s.damaged_count,
                  s.is_settled AS item_settled,
                  s.loss_count,
                  sch.amount AS credit_amount,
                  sch.creditedDate AS credit_date,

                  IFNULL(dsr.returned_quantity,0) AS return_qty,
                  IFNULL(dsr.return_amount,0) AS return_amount,
                  (s.quantity_sold - IFNULL(dsr.returned_quantity,0)) AS remaining_qty
              FROM
                  sales s
              JOIN
                  users u ON s.marketing_staff_id = u.user_id
              JOIN
                  products p ON s.product_id = p.product_id
              JOIN
                  product_prices pp ON s.price_id = pp.price_id
              LEFT JOIN
                  sales_credit_history sch ON s.sale_tracking_Id = sch.sale_tracking_Id AND sch.isActive = 1
              LEFT JOIN 
                  direct_sale_return dsr ON s.product_id = dsr.product_id 
                  AND s.sale_tracking_Id = dsr.sale_tracking_Id
                  WHERE
                  s.sale_tracking_Id = ? AND  s.sale_type != ?
              `,
        [sale_tracking_id, type]
      );
      console.log(salesDetails);
      if (salesDetails.length === 0) {
        return res.status(404).json({ message: "Sale details not found." });
      }

      res.json(salesDetails);
    } catch (error) {
      console.error("Error fetching sale details:", error);
      res.status(500).json({ error: "Database error" });
    }
  };


exports.deleteDirectSaleProduct = async (req, res) => {
  let connection;
  try {
    //console.log(req.body);
    const { product_id, sale_id, sale_tracking_id, loggedInUserId } = req.body;
    if (!product_id)  return res.status(400).json({ error: "Product ID is required." });  
    if (!sale_id) return res.status(400).json({ error: "Sale ID is required." });
    if (!sale_tracking_id) return res.status(400).json({ error: "Sale Tracking ID  ID is required." });

    connection = await pool.getConnection();
    
    await connection.beginTransaction();

    const [result] =  await connection.execute(
          "UPDATE `sales` SET `isActive` = 0 WHERE `product_id`= ? AND `sale_tracking_Id`=?",
          [product_id, sale_tracking_id]
        );
    if (result.affectedRows === 0){
        return res.status(400).json({ error: "Sales data not updated" });
    }else{
      const [product] =  await connection.execute(
          "SELECT quantity_sold, amount_received from `sales` WHERE `product_id`= ? AND `sale_tracking_Id`=? AND `isActive` = 0",
          [product_id, sale_tracking_id]
        );
        const { quantity_sold, amount_received } = product[0] ?? {};
        const [stockUpdate] =  await connection.execute(
            "UPDATE `stock` SET quantity = quantity +  ? WHERE `product_id` = ?",
            [quantity_sold, product_id]
        );
        const [finalSaleUpdate] =  await connection.execute(
            "UPDATE `final_sale` SET TotalAmount = TotalAmount - ? WHERE `sale_tracking_Id`= ?",
            [amount_received, sale_tracking_id]
        );
        //Stock ID from stock table 
        const [stockRows] = await connection.execute(
        "SELECT `stock_id` FROM `stock` WHERE `product_id` = ? AND isActive = 1",
        [product_id]
      ); 
        // Check if stock exists
        if (stockRows.length === 0) {
          return res.status(400).json({ error: "Stock not found for this product" });
        }

        const stockId = stockRows[0].stock_id;
        //Delete stock history
        await connection.execute(
          "DELETE FROM `stock_History` WHERE `ReferenceInvoiceOrSale` = ? AND `stock_Id` = ?",
          [sale_tracking_id, stockId]
        );

        const [count] =  await connection.execute(
          "SELECT COUNT(*) AS productCount FROM `sales` WHERE `sale_tracking_Id`= ? AND isActive = 1",
          [sale_tracking_id]
        );
        const{ productCount } =  count[0];
        //console.log(productCount);
        if(productCount === 0 ){
        const [finalSaleUpdate] =  await connection.execute(
            "UPDATE `final_sale` SET isActive = 0 WHERE `sale_tracking_Id`= ?",
            [sale_tracking_id]
        );          
        }
        await logUserActivity({
        req,
        user_id :loggedInUserId,
        action: `Product deleted from sales data - ${sale_tracking_id} (Sale tracking ID), ${product_id} (Product ID)`
      });
      // Commit the transaction
      await connection.commit();
      return res.status(200).json({ message: "Product deleted successfully." , productCount });    
    }
     } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error in deleting sale", error);
        res.status(500).json({ error: "Database error" });
      } finally {
        if (connection) connection.release();
      }

  };    



exports.deleteAllDirectSaleProducts = async (req, res) => {
  let connection;
  try {
    const { sale_tracking_id, loggedInUserId} = req.body;
    if (!sale_tracking_id) {
      return res.status(400).json({ error: "Sale Tracking ID is required." });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    //Update final_sale
    const [result] = await connection.execute(
      "UPDATE `final_sale` SET `isActive` = 0 WHERE `sale_tracking_Id` = ? AND `isActive` = 1",
      [sale_tracking_id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Sales data not updated" });
    }else{
    const [products] = await connection.execute(
      "SELECT `product_id`, `quantity_sold` FROM `sales` WHERE `sale_tracking_Id` = ? AND isActive = 1",
      [sale_tracking_id]
    );

    if (products.length === 0) {
      return res.status(400).json({ error: "No active products found" });
    }
    //Delete stock history
    await connection.execute(
      "DELETE FROM `stock_History` WHERE `ReferenceInvoiceOrSale` = ?",
      [sale_tracking_id]
    );
    //Update all products
    await Promise.all(
      products.map(({ product_id, quantity_sold }) =>
        (async () => {
          // Update sales
          await connection.execute(
            "UPDATE `sales` SET `isActive` = 0 WHERE `sale_tracking_Id` = ? AND `product_id` = ?",
            [sale_tracking_id, product_id]
          );

          // Update stock
          await connection.execute(
            "UPDATE `stock` SET quantity = quantity + ? WHERE `product_id` = ?",
            [quantity_sold, product_id]
          );
        })()
      )
    );
        await logUserActivity({
        req,
        user_id :loggedInUserId,
        action: `All Products deleted from sales entry - ${sale_tracking_id} (Sale tracking ID)`
      });
      await connection.commit();
     return res.status(200).json({ message: "All products deleted successfully." });
  } 
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error deleting sale details:", error);
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) connection.release();
  }
}; 



  // exports.  deleteAllDirectSaleProducts = async (req, res) => {
  // try {
  //   console.log(req.body);
  //   const {sale_tracking_id } = req.body;
    
  //   if (!sale_tracking_id) return res.status(400).json({ error: "Sale Tracking ID  ID is required." });

  //    const [result] =  await pool.query(
  //          "UPDATE `final_sale` set `TotalAmount`= 0, `isActive` = 0   WHERE `sale_tracking_Id`= ? AND `isSettled`=0 AND `isActive`=1",
  //         [sale_tracking_id]
  //        );
  //    if (result.affectedRows === 0)  return res.status(400).json({ error: "Sales data not updated" });
  //    else{
  //      const [products] =  await pool.query(
  //          "SELECT `product_id`, `quantity_sold`, `amount_received`, `sale_tracking_Id`  FROM `sales` WHERE `sale_tracking_Id` = ? AND isActive =1 ",
  //          [sale_tracking_id]
  //        );
  //       if (products.length === 0)  return res.status(400).json({ error: "No active products found" });
  //       // Step 3: Update each product individually
  //       for (const { product_id, quantity_sold } of products) {
  //         const [saleUpdate] =  await pool.query(
  //           "UPDATE `sales` SET `quantity_sold` = 0, amount_received = 0, `isActive` = 0 WHERE `sale_tracking_Id` = ? AND `product_id` = ?",
  //           [sale_tracking_id, product_id])

  //         const [stockUpdate] =  await pool.query(
  //             "UPDATE `stock` SET quantity = quantity + ? WHERE `product_id` = ?",
  //             [quantity_sold, product_id]
  //           );
  //         }
  //         return res.status(200).json({ message: "All product deleted successfully." });  
  //     }       
  //    }catch (error) {
  //   console.error("Error fetching sale details:", error);
  //   res.status(500).json({ error: "Database error" });
  //     }

  // };    

exports.viewSalesData = async (req, res) => {
  try {
    const { selectedUser, selectedProduct, startDate, endDate } = req.body;
    if (!startDate) {
      return res.status(400).json({ error: "Start date is required." });
    }
    if (!endDate) {
      return res.status(400).json({ error: "End date is required." });
    }

    let query = `
    SELECT DATE_FORMAT(sale_date, '%Y-%m-%d') AS saleDate,
          COALESCE(SUM(quantity_sold), 0) AS totalQuantitySold
    FROM sales
    WHERE 
      sale_date BETWEEN ? AND ?
      AND isActive = 1
  `;
    let params = [startDate, endDate];

    if (selectedUser !== "all") {
      query += " AND marketing_staff_id = ?";
      params.push(selectedUser);
    }

    if (selectedProduct !== "all_product") {
      query += " AND product_id = ? ";
      params.push(selectedProduct);
    }
    query += `
    GROUP BY DATE_FORMAT(sale_date, '%Y-%m-%d')
    ORDER BY saleDate`;
    
    const [salesQtyDetails] = await pool.query(query, params);

    if (salesQtyDetails.length === 0) {
      return res.status(404).json({ message: "Sale details not found." });
    }
    //console.log(salesQtyDetails);
    let query1, params1 = [startDate, endDate];

    if (selectedUser === "all") {
      // Top products overall
      query1 = `
        SELECT 
            p.product_id,
            p.product_name,
            SUM(s.quantity_sold) AS totalQuantitySold
        FROM sales s
        INNER JOIN products p ON s.product_id = p.product_id
        WHERE 
            s.sale_date BETWEEN ? AND ?
            AND s.isActive = 1
        GROUP BY p.product_id
        ORDER BY totalQuantitySold DESC
        LIMIT 10
      `;
    } else {
      // Top products for the specific user
      query1 = `
        SELECT 
            p.product_id,
            p.product_name,
            u.user_id AS marketing_staff_id,
            u.name AS marketing_staff_name,
            SUM(s.quantity_sold) AS totalQuantitySold
        FROM sales s
        INNER JOIN products p ON s.product_id = p.product_id
        INNER JOIN users u ON s.marketing_staff_id = u.user_id
        WHERE 
            s.sale_date BETWEEN ? AND ?
            AND s.isActive = 1
            AND u.user_id = ?
        GROUP BY p.product_id, u.user_id
        ORDER BY totalQuantitySold DESC
        LIMIT 10
      `;
      params1.push(selectedUser);
    }

    const [productSold] = await pool.query(query1, params1);


    if (productSold.length === 0) {
      return res.status(404).json({ message: "No sales found in this period." });
    }

        let userWiseSales = [];
    if (selectedUser === "all") {
      const query2 = `
        SELECT u.user_id, u.name AS userName,
               SUM(s.quantity_sold) AS totalQuantitySold
        FROM sales s
        INNER JOIN users u ON s.marketing_staff_id = u.user_id
        WHERE s.sale_date BETWEEN ? AND ?
          AND s.isActive = 1
        GROUP BY u.user_id, u.name
        ORDER BY totalQuantitySold DESC
        LIMIT 10
      `;
      [userWiseSales] = await pool.query(query2, [startDate, endDate]);
    }

    return res.json({
      salesQtyDetails,
      productSold,
      userWiseSales
    });
  } catch (error) {
    console.error("Error fetching sale quantity details:", error);
    res.status(500).json({ error: "Database error" });
  }
};

// 1. Fetch Sales Quantity Details
exports.getSalesQtyDetailsForPrint = async (req, res) => {
  try {
    const { selectedUser, selectedProduct, startDate, endDate } = req.body;
    console.log(req.body)
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start and end dates are required." });
    }

    let query = `
      SELECT DATE_FORMAT(sale_date, '%Y-%m-%d') AS saleDate,
            COALESCE(SUM(quantity_sold), 0) AS totalQuantitySold
      FROM sales
      WHERE sale_date BETWEEN ? AND ? 
        AND isActive = 1
    `;
    let params = [startDate, endDate];

    if (selectedUser !== "all") {
      query += " AND marketing_staff_id = ?";
      params.push(selectedUser);
    }

    if (selectedProduct !== "all_product") {
      query += " AND product_id = ?";
      params.push(selectedProduct);
    }

    query += `
      GROUP BY DATE_FORMAT(sale_date, '%Y-%m-%d')
      ORDER BY saleDate
    `;

    const [salesQtyDetails] = await pool.query(query, params);

    if (salesQtyDetails.length === 0) {
      return res.status(404).json({ message: "Sale details not found." });
    }

    return res.json({ salesQtyDetails });
  } catch (error) {
    console.error("Error fetching sales quantity details:", error);
    res.status(500).json({ error: "Database error" });
  }
};


// 2. Fetch Top Products Sold
exports.getProductwiseDetailsForPrint = async (req, res) => {
  try {
    const { selectedUser, startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start and end dates are required." });
    }

    let query, params = [startDate, endDate];

    if (selectedUser === "all") {
      query = `
        SELECT 
          p.product_id,
          p.product_name,
          SUM(s.quantity_sold) AS totalQuantitySold
        FROM sales s
        INNER JOIN products p ON s.product_id = p.product_id
        WHERE s.sale_date BETWEEN ? AND ?
          AND s.isActive = 1
        GROUP BY p.product_id
        ORDER BY totalQuantitySold DESC
      `;
    } else {
      query = `
        SELECT 
          p.product_id,
          p.product_name,
          u.user_id AS marketing_staff_id,
          u.name AS marketing_staff_name,
          SUM(s.quantity_sold) AS totalQuantitySold
        FROM sales s
        INNER JOIN products p ON s.product_id = p.product_id
        INNER JOIN users u ON s.marketing_staff_id = u.user_id
        WHERE s.sale_date BETWEEN ? AND ?
          AND s.isActive = 1
          AND u.user_id = ?
        GROUP BY p.product_id, u.user_id
        ORDER BY totalQuantitySold DESC
      `;
      params.push(selectedUser);
    }

    const [productSold] = await pool.query(query, params);

    if (productSold.length === 0) {
      return res.status(404).json({ message: "No sales found in this period." });
    }

    return res.json({ productSold });
  } catch (error) {
    console.error("Error fetching product sales:", error);
    res.status(500).json({ error: "Database error" });
  }
};


// 3. Fetch User-Wise Sales
exports.getUserwiseDetailsForPrint = async (req, res) => {
  try {
    const { selectedUser, startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start and end dates are required." });
    }

    if (selectedUser !== "all") {
      return res.status(400).json({ error: "User-wise sales only available when selectedUser = 'all'." });
    }

    const query = `
      SELECT u.user_id, u.name AS userName,
             SUM(s.quantity_sold) AS totalQuantitySold
      FROM sales s
      INNER JOIN users u ON s.marketing_staff_id = u.user_id
      WHERE s.sale_date BETWEEN ? AND ?
        AND s.isActive = 1
      GROUP BY u.user_id, u.name
      ORDER BY totalQuantitySold DESC
    `;
    const [userWiseSales] = await pool.query(query, [startDate, endDate]);

    if (userWiseSales.length === 0) {
      return res.status(404).json({ message: "No user sales found in this period." });
    }

    return res.json({ userWiseSales });
  } catch (error) {
    console.error("Error fetching user-wise sales:", error);
    res.status(500).json({ error: "Database error" });
  }
};

exports.checkInvoiceExists = async (req, res) => {
  try {
   const { invoiceNumber} = req.body;
    const [rows] = await pool.query(
      `
      SELECT invoiceNumber 
      FROM final_sale 
      WHERE invoiceNumber = ?
      LIMIT 1
      `,
      [invoiceNumber]
    );
    console.log(rows)
    if (rows.length > 0) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }

  } catch (err) {
    console.error("Error checking invoice:", err);
    res.status(500).json({ error: "Database error" });

  }

  
};

exports.getLastInvoiceNum = async (req, res) => {
  try {

   const [[nonGst]] = await pool.query(
      `
      SELECT invoiceNumber 
      FROM final_sale 
      WHERE isGstBilling = 0 
      ORDER BY id DESC 
      LIMIT 1
      `
    );

    const [[gst]] = await pool.query(
      `
      SELECT invoiceNumber 
      FROM final_sale 
      WHERE isGstBilling = 1 
      ORDER BY id DESC 
      LIMIT 1
      `
    );
     return res.json( {
      lastNonGstInvoice: nonGst ? nonGst.invoiceNumber : null,
      lastGstInvoice: gst ? gst.invoiceNumber : null
    });

  } catch (err) {
    console.error("Error checking invoice:", err);
    res.status(500).json({ error: "Database error" });

  }

  
};

exports.fetchCustomerCreditAmount = async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    return res
      .status(400)
      .json({ success: false, message: "customerId is required." });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT 
          c.id AS customerId,
          c.Name AS customerName,
          SUM(
              (fs.TotalAmount - (fs.FuelExpenses + fs.VehcileServiceExpenses + fs.OtherExpenses))
              - fs.AmountPaid
          ) AS totalCredit
      FROM final_sale fs
      JOIN (
          SELECT sale_tracking_Id, MIN(sale_type) AS sale_type
          FROM sales
          GROUP BY sale_tracking_Id
      ) s ON fs.sale_tracking_Id = s.sale_tracking_Id
      JOIN Customers c ON c.id = fs.UserId
      WHERE 
          fs.isActive = 1
          AND s.sale_type != 'marketing'
          AND c.id = ?
      GROUP BY c.id
      `,
      [customerId]
    );

    res.json({
      success: true,
      data: rows[0] || {
        customerId,
        customerName: null,
        totalCredit: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching customer credit:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer credit amount",
    });
  }
};



//fetch data for with allocation ID - final sale -ID
exports.fetchSalesDataByIDSaleTrackingID = async (req, res) => {
  try {
    let { saleTrackingId } = req.body;
    // Step 1: Get final sale data
    const [finalSalerows] = await pool.query(
      "SELECT `id`, `sale_tracking_Id`, `TotalAmount`, `UserId`, `DateofTransaction`, `isSettled`, `AmountPaid`, `FuelExpenses`, `VehcileServiceExpenses`, `OtherExpenses`, `invoiceNumber`, COALESCE(`users`.`name`, 'Admin') as addedBy  FROM `final_sale` LEFT JOIN `users` ON `final_sale`.`addedBy` = `users`.`user_id` WHERE   `sale_tracking_Id` = ? AND `final_sale`.`isActive` = 1",
      [saleTrackingId]
    );

    // Check if sale data exists
    if (finalSalerows.length === 0) {
      return res.json({
        success: false,
        message: "No final sale found for given date.",
      });
    }

   // const saleTrackingId = finalSalerows[0].sale_tracking_Id; // Assume first record for simplicity

    // Step 2: Get product sale data
    const [productData] = await pool.query(
      `SELECT 
                s.sale_id, 
                s.sale_type, 
                s.marketing_staff_id, 
                p.product_name,
                p.product_id,
                pp.marketing_selling_price, 
                s.quantity_sold, 
                s.amount_received, 
                s.is_credit, 
                s.sale_tracking_Id, 
                s.sale_date, 
                s.damaged_count, 
                s.is_settled, 
                s.loss_count, 
                s.isActive,
                fs.id  AS final_sale_id,
                u.name
            FROM 
                sales s
            JOIN 
                products p ON s.product_id = p.product_id
            JOIN 
                product_prices pp ON pp.price_id = s.price_id    
            JOIN
                final_sale fs ON s.sale_tracking_Id = fs.sale_tracking_Id
            JOIN 
                users u ON s.marketing_staff_id = u.user_id        
            WHERE 
                 fs.sale_tracking_Id = ?  AND s.isActive = 1 AND fs.isActive = 1`,
      [saleTrackingId]
    );

    // Step 3: Get payment breakdown (using sale_tracking_Id from above)
    const [transactionData] = await pool.query(
      "SELECT SUM(`amount`) AS total, SUM(`UPI`) AS upi, SUM(`Cash`) AS cash, SUM(`Card`) AS card FROM `sales_credit_history` WHERE `sale_tracking_Id` = ?",
      [saleTrackingId]
    );

        // Step 4: Find sale type
    const saleType = productData.length > 0 ? productData[0].sale_type : null;

    // Step 5: Get UserId from final_sale
    const userId = finalSalerows[0].UserId;
    let userDetails = {};

    if (saleType && saleType !== "marketing") {
      // Fetch from customers table
      const [customerRows] = await pool.query(
        "SELECT Name FROM customers WHERE id = ?",
        [userId]
      );

      userDetails.name = customerRows[0]?.Name || {};

    } else {
      // Fetch from users table
      const [userRows] = await pool.query(
        "SELECT name FROM users WHERE user_id = ?",
        [userId]
      );

      userDetails.name = userRows[0]?.name || {};
    }

    res.json({
      success: true,
      saledata: finalSalerows,
      details: productData,
      payments: transactionData[0] || {},
      saleType: saleType,
      userDetails: userDetails
    });
  } catch (error) {
    console.error("Error fetching daily data:", error);
    res.status(500).json({ success: false, message: "Failed to fetch data" });
  }
};



exports.submitProductReturn = async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Items must be an array" });
  }
  const now = getISTTimestamp();
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const item of items) {

      const saleTrackingId = item.saleTrackingId || null;
      const product_id = item.product_id || null;
      const returned_quantity = Number(item.returned_quantity || 0);
      const return_amount = Number(item.return_amount || 0);
      const added_by = item.added_by || null;

      if (!saleTrackingId || !product_id) {
        console.log("Skipping invalid item:", item);
        continue;
      }

      if (returned_quantity <= 0) continue;
      
      // Get sold quantity
      const [saleData] = await connection.execute(
        `SELECT quantity_sold 
        FROM sales 
        WHERE sale_tracking_Id = ? AND product_id = ?`,
        [saleTrackingId, product_id]
      );

      const quantity_sold = saleData[0]?.quantity_sold || 0;

      // Get already returned
      const [existingReturn] = await connection.execute(
        `SELECT returned_quantity 
        FROM direct_sale_return
        WHERE sale_tracking_Id = ? AND product_id = ?`,
        [saleTrackingId, product_id]
      );

      // const alreadyReturned = existingReturn[0]?.returned_quantity || 0;

      // const remainingQty = quantity_sold - alreadyReturned;

      // if (returned_quantity > remainingQty) {

      //   await connection.rollback();

      //   return res.status(400).json({
      //     error: `Return quantity exceeds remaining quantity. Remaining: ${remainingQty}`
      //   });

      // }

      const [existing] = await connection.execute(
        `SELECT direct_sale_return_id FROM direct_sale_return
         WHERE product_id = ? AND sale_tracking_Id = ?`,
        [product_id, saleTrackingId]
      );

      if (existing.length > 0) {

        await connection.execute(
          `UPDATE direct_sale_return SET
           returned_quantity =  ?,
           return_amount =  ?,
           date = ?
           ,
           added_by = ?
           WHERE product_id = ? AND sale_tracking_Id = ?`,
          [returned_quantity, return_amount, now, added_by, product_id, saleTrackingId]
        );

      } else {

        await connection.execute(
          `INSERT INTO direct_sale_return (
            sale_tracking_Id,
            product_id,
            returned_quantity,
            return_amount,
            date,
            added_by
          ) VALUES (?, ?, ?, ?, NOW(), ?)`,
          [saleTrackingId, product_id, returned_quantity, return_amount, added_by]
        );

      }

      await connection.execute(
        `UPDATE stock SET quantity = quantity + ? WHERE product_id = ?`,
        [returned_quantity, product_id]
      );
    }

    await connection.commit();

    res.status(200).json({
      message: "Returns and stock updated successfully."
    });

  } catch (error) {

    if (connection) await connection.rollback();
    console.error(error);

    res.status(500).json({ error: "Database error" });

  } finally {

    if (connection) connection.release();

  }
};

exports.getGSTInvoiceNumber = async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT * FROM invoive_number_counter WHERE isActive = 1"
    );

    if (!rows.length) {
      throw new Error("Counter row not found");
    }
    const data = rows[0];

    const newCounter = data.GST_counter + 1;
    const formattedCounter = String(newCounter).padStart(5, "0");

    const gstInvoiceNumber = `${data.GST_prefix}${formattedCounter}${data.GST_suffix}`;

    await connection.commit();

    res.json({ gstInvoiceNumber });

  } catch (error) {
    if (connection) await connection.rollback(); 
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release(); 
  }
};

exports.getNGSTInvoiceNumber = async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT * FROM invoive_number_counter WHERE isActive = 1"
    );

    if (!rows.length) {
      throw new Error("Counter row not found");
    }
    const data = rows[0];

    const newCounter = data.NGST_counter + 1;
    const formattedCounter = String(newCounter).padStart(5, "0");

    const ngstInvoiceNumber = `${data.NGST_prefix}${formattedCounter}${data.NGST_suffix}`;

    await connection.commit();

    res.json({ ngstInvoiceNumber });

  } catch (error) {
    if (connection) await connection.rollback(); 
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release(); 
  }
};