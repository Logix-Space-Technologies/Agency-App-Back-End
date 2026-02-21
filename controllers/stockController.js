const pool = require('../config/db');
const { getISTTimestamp, getISTDate } = require('../utils/dateUtils');

// View all stocks with complete information
exports.viewAllStocks = async (req, res) => {
    try {
//         const query = `
//  SELECT 
//     p.product_id,
//     p.product_name,
//     p.category_id,
//     c.category_name,
//     s.stock_id,
//     s.quantity AS stock_quantity,
//     COALESCE(s.Damage_Qty, 0) AS Damage_Qty,
//     COALESCE(s.Loss_Qty, 0) AS Loss_Qty,
//     pp.price_id,
//     COALESCE(pp.purchase_price, 0) AS purchase_price,
//     COALESCE(pp.marketing_selling_price, 0) AS marketing_selling_price,
//     COALESCE(pp.direct_selling_price, 0) AS direct_selling_price,
//     COALESCE(pp.whole_sale_price, 0) AS whole_sale_price,
//     COALESCE(SUM(dsa.allocated_quantity), 0) AS allocated_stock,
//     s.quantity - COALESCE(SUM(dsa.allocated_quantity), 0) AS current_stock

// FROM 
//     stock s
// JOIN 
//     products p ON s.product_id = p.product_id
// JOIN 
//     product_prices pp ON s.price_id = pp.price_id
// LEFT JOIN 
//     categories c ON p.category_id = c.category_id
// LEFT JOIN 
//     daily_stock_allocation dsa 
//     ON s.product_id = dsa.product_id 
//     AND dsa.converted_to_sales = 0 
//     AND dsa.isActive = 1

// WHERE 
//     s.isActive = 1 

// GROUP BY 
//     s.stock_id, 
//     p.product_id, 
//     pp.price_id, 
//     s.quantity, 
//     s.Damage_Qty, 
//     s.Loss_Qty, 
//     p.product_name, 
//     p.category_id, 
//     c.category_name;

//         `;


const query = `

SELECT
    p.product_id,
    p.product_name,
    p.category_id,
    c.category_name,

    s.stock_id,
    s.quantity AS stock_quantity,

    /* ---------- DAMAGE & LOSS FROM STOCK ---------- */
    COALESCE(s.Damage_Qty, 0) AS Damage_Qty,
    COALESCE(s.Loss_Qty, 0) AS Loss_Qty,

    /* ---------- DAMAGE & LOSS FROM SALES ---------- */
    COALESCE(MAX(sa.today_damage_qty), 0) AS today_damage_qty,
    COALESCE(MAX(sa.total_damage_qty), 0) AS total_damage_qty,
    COALESCE(MAX(sa.today_loss_qty), 0) AS today_loss_qty,
    COALESCE(MAX(sa.total_loss_qty), 0) AS total_loss_qty,

    /* ---------- ACTIVE PRICE (PRODUCT LEVEL) ---------- */
    pp.price_id,
    pp.purchase_price,
    pp.marketing_selling_price,
    pp.direct_selling_price,
    pp.whole_sale_price,

    /* ---------- ALLOCATION ---------- */
    COALESCE(SUM(dsa.allocated_quantity), 0) AS allocated_stock,

    /* ---------- CURRENT STOCK ---------- */
    (
        s.quantity
        - COALESCE(SUM(dsa.allocated_quantity), 0)
        - COALESCE(s.Damage_Qty, 0)
    ) AS current_stock

FROM stock s
JOIN products p 
    ON s.product_id = p.product_id

/* ✅ FIX: ACTIVE PRICE BY PRODUCT (NOT FILTERING STOCK) */
LEFT JOIN product_prices pp
    ON pp.product_id = s.product_id
    AND pp.isActive = 1

LEFT JOIN categories c 
    ON p.category_id = c.category_id

LEFT JOIN daily_stock_allocation dsa
    ON s.product_id = dsa.product_id
    AND dsa.converted_to_sales = 0
    AND dsa.isActive = 1

LEFT JOIN (
    SELECT
        product_id,
        SUM(damaged_count) AS total_damage_qty,
        SUM(loss_count) AS total_loss_qty,
        SUM(CASE WHEN sale_date = CURDATE()
                 THEN damaged_count ELSE 0 END) AS today_damage_qty,
        SUM(CASE WHEN sale_date = CURDATE()
                 THEN loss_count ELSE 0 END) AS today_loss_qty
    FROM sales
    WHERE isActive = 1
    GROUP BY product_id
) sa
    ON sa.product_id = s.product_id

WHERE s.isActive = 1

GROUP BY
    s.stock_id,
    p.product_id,
    p.product_name,
    p.category_id,
    c.category_name,
    s.quantity,
    s.Damage_Qty,
    s.Loss_Qty,
    pp.price_id

ORDER BY current_stock DESC;








    `
;

        
        const [stocks] = await pool.query(query);
        
        // Calculate total stock (stock + allocated)
        const stocksWithTotal = stocks.map(stock => ({
            ...stock,
            stock_total: Number(stock.current_stock),
            // Ensure all price fields are numbers
            purchase_price: Number(stock.purchase_price),
            marketing_selling_price: Number(stock.marketing_selling_price),
            direct_selling_price: Number(stock.direct_selling_price),
            whole_sale_price: Number(stock.whole_sale_price)
        }));
        
        res.json(stocksWithTotal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};


//add stock
exports.addStocks = async (req, res) => {
    try {
        const { product_id, price_id, quantity, } = req.body
        if (!product_id) return res.status(400).json({ error: "product id required" })
        const [result] = await pool.query('INSERT INTO `stock`( `product_id`, `price_id`, `quantity`, `added_date`, `isActive`) VALUES (?,?,?,now(),1)',
            [product_id, price_id, quantity]
        )
        res.json({ message: 'stock added successfully', stock_id: result.insertId });

    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}

//search stock 
exports.searchStock = async (req, res) => {
    try {
        const { stock_id } = req.body;
        if (!stock_id) return res.status(400).json({ error: "stock id required" })
        const [result] = await pool.query('SELECT `stock_id`, `product_id`, `price_id`, `quantity`, `added_date` FROM `stock` WHERE `stock_id` = ? AND `isActive` = 1', [stock_id])
        res.json(result)
    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }

}

//delete stock
exports.deleteStock = async (req, res) => {
    console.log( req.body)
    try {
        const { stock_id } = req.body;
        if (!stock_id) return res.status(400).json({ error: "stock id required" })
        const [result]=await pool.query('UPDATE `stock` SET `isActive` = 0 WHERE `stock_id`=?', [stock_id])
        if (result.affectedRows === 0) return res.status(400).json({ error: 'stock id not found' });
                res.json({ message: 'stock id deleted successfully' })

    }catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}


exports.stockHistory = async (req, res) => {
  try {
    const { product_id, fromDate, toDate } = req.body;
    //console.log(req.body);

    // --- Product is mandatory ---
    // if (!product_id) {
    //   return res.status(400).json({ error: "product_id is required" });
    // }

    // Base query
    let query = `
      SELECT 
        h.stock_History_Id,
        h.stock_Id,
        h.Qty,
        h.stock_type,
        h.AddedDate,
        h.AddedBy,
        h.CreditOrDebit,
        h.ReferenceInvoiceOrSale,
        s.quantity,
        s.Damage_Qty,
        s.Loss_Qty,
        p.product_name,
        sa.sale_type
      FROM stock_History h
      JOIN stock s ON h.stock_Id = s.stock_id
      JOIN products p ON p.product_id = s.product_id
      LEFT JOIN sales sa     
          ON 
          sa.sale_tracking_Id = h.ReferenceInvoiceOrSale 
          AND sa.product_id = s.product_id
      WHERE s.isActive = 1
    `;
    const queryParams = [];
    //const queryParams = [product_id];
    // --- Optional Date Range ---
    if (product_id ) {
      query += ` AND s.product_id = ?`;
      queryParams.push(product_id);
    }

    // --- Optional Date Range ---
    if (fromDate && toDate) {
      query += ` AND DATE(h.AddedDate) BETWEEN ? AND ?`;
      queryParams.push(fromDate, toDate);
    }

    // Order results
    query += ` ORDER BY h.AddedDate DESC`;

    //console.log(query);
    //console.log(queryParams);


    // Execute
    const [result] = await pool.query(query, queryParams);

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

exports.saveOpeningClosingBalance = async (req, res) => {
  try {
    //const today = new Date().toISOString().split("T")[0];
    const today = getISTDate();
    const now = getISTTimestamp()

    /* 1️⃣ Get all active products */
    const [products] = await pool.query(`
      SELECT product_id
      FROM products
      WHERE isActive = 1
    `);

    if (products.length === 0) {
      return res.json({ message: "No active products found" });
    }

    for (const product of products) {
      const productId = product.product_id;

      /* 2️⃣ Opening stock (yesterday closing OR stock table) */
      const [prev] = await pool.query(
        `
        SELECT closing_stock
        FROM opening_closing_balance
        WHERE product_id = ?
        AND date < ?
        ORDER BY date DESC
        LIMIT 1
        `,
        [productId, today]
      );

      let openingStock = 0;

      if (prev.length > 0) {
        openingStock = prev[0].closing_stock;
      } else {
        const [[stock]] = await pool.query(
          `
          SELECT quantity
          FROM stock
          WHERE product_id = ?
          AND isActive = 1
          `,
          [productId]
        );
        openingStock = stock ? stock.quantity : 0;
      }

      /* 3️⃣ Sales, damage, loss (today) */
      const [[sales]] = await pool.query(
        `
        SELECT 
          IFNULL(SUM(quantity_sold),0) AS sold_qty,
          IFNULL(SUM(damaged_count),0) AS damage_qty,
          IFNULL(SUM(loss_count),0) AS loss_qty
        FROM sales
        WHERE product_id = ?
        AND sale_date = ?
        AND isActive = 1
        `,
        [productId, today]
      );

      /* 4️⃣ Misc damage (today) */
      const [[misc]] = await pool.query(
        `
        SELECT IFNULL(SUM(quantity),0) AS misc_damage_qty
        FROM miscellaneous_damage
        WHERE product_id = ?
        AND DATE(addedDate) = ?
        AND isActive = 1
        `,
        [productId, today]
      );
      
      /* 5️⃣ Closing stock */
      const closingStock =
        openingStock -
        sales.sold_qty -
        sales.damage_qty -
        sales.loss_qty -
        misc.misc_damage_qty;

      /* 6️⃣ Insert / Update */
      await pool.query(
        `
        INSERT INTO opening_closing_balance
        (
          product_id,
          date,
          opening_stock,
          closing_stock,
          sold_qty,
          damage_qty,
          loss_qty,
          misc_damage_qty,
          created
        )
        VALUES (?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          opening_stock = VALUES(opening_stock),
          closing_stock = VALUES(closing_stock),
          sold_qty = VALUES(sold_qty),
          damage_qty = VALUES(damage_qty),
          loss_qty = VALUES(loss_qty),
          misc_damage_qty = VALUES(misc_damage_qty),
          created = VALUES(created)
        `,
        [
          productId,
          today,
          openingStock,
          closingStock,
          sales.sold_qty,
          sales.damage_qty,
          sales.loss_qty,
          misc.misc_damage_qty,
          now
        ]
      );
    }

    res.json({
      message: "Daily opening & closing balance generated successfully",
      date: today,
      totalProducts: products.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



exports.viewOpeningClosingStock = async (req, res) => {
  try {
    const { product_id, fromDate, toDate } = req.body;

    // Validate date range (max 15 days back)
    const today = new Date();
    const minAllowedDate = new Date();
    minAllowedDate.setDate(today.getDate() - 15);

    if (fromDate) {
      const selectedFromDate = new Date(fromDate);

      if (selectedFromDate < minAllowedDate) {
        return res.status(400).json({
          error: "From date cannot be older than 15 days from today"
        });
      }
    }

    if (toDate) {
      const selectedToDate = new Date(toDate);

      if (selectedToDate < minAllowedDate) {
        return res.status(400).json({
          error: "To date cannot be older than 15 days from today"
        });
      }
    }

    let query = `
      SELECT 
        ocb.id,
        ocb.product_id,
        p.product_name,
        ocb.date,
        ocb.opening_stock,
        ocb.closing_stock,
        ocb.sold_qty,
        ocb.damage_qty,
        ocb.loss_qty,
        ocb.misc_damage_qty
      FROM opening_closing_balance ocb
      JOIN products p ON p.product_id = ocb.product_id
      WHERE 1=1
    `;
    const queryParams = [];
    //const queryParams = [product_id];
    // --- Optional Date Range ---
    if (product_id ) {
      query += ` AND ocb.product_id = ?`;
      queryParams.push(product_id);
    }

    // --- Optional Date Range ---
    if (fromDate && toDate) {
      query += ` AND DATE(ocb.date) BETWEEN ? AND ?`;
      queryParams.push(fromDate, toDate);
    }

    // Order results
    query += ` ORDER BY ocb.date DESC`;

    // Execute
    const [result] = await pool.query(query, queryParams);

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};
