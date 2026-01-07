const pool = require('../config/db');

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

    /* ---------- DAMAGE & LOSS FROM STOCK (AUTHORITATIVE) ---------- */
    COALESCE(s.Damage_Qty, 0) AS Damage_Qty,
    COALESCE(s.Loss_Qty, 0) AS Loss_Qty,

    /* ---------- DAMAGE & LOSS FROM SALES (REPORTING) ---------- */
    COALESCE(MAX(sa.today_damage_qty), 0) AS today_damage_qty,
    COALESCE(MAX(sa.total_damage_qty), 0) AS total_damage_qty,
    COALESCE(MAX(sa.today_loss_qty), 0) AS today_loss_qty,
    COALESCE(MAX(sa.total_loss_qty), 0) AS total_loss_qty,

    /* ---------- PRICE (ACTIVE PRICE ONLY, WITHOUT FILTERING STOCK) ---------- */
    pp.price_id,
    pp.purchase_price,
    pp.marketing_selling_price,
    pp.direct_selling_price,
    pp.whole_sale_price,

    /* ---------- ALLOCATION ---------- */
    COALESCE(SUM(dsa.allocated_quantity), 0) AS allocated_stock,

    /* ---------- CORRECT CURRENT STOCK ---------- */
    (
        s.quantity
        - COALESCE(SUM(dsa.allocated_quantity), 0)
        - COALESCE(s.Damage_Qty, 0)
    ) AS current_stock

FROM stock s
JOIN products p 
    ON s.product_id = p.product_id

/* ✅ IMPORTANT FIX: LEFT JOIN + isActive condition */
LEFT JOIN product_prices pp 
    ON pp.price_id = s.price_id
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
        SUM(CASE 
                WHEN sale_date = CURDATE() 
                THEN damaged_count 
                ELSE 0 
            END) AS today_damage_qty,
        SUM(CASE 
                WHEN sale_date = CURDATE() 
                THEN loss_count 
                ELSE 0 
            END) AS today_loss_qty
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
    if (!product_id) {
      return res.status(400).json({ error: "product_id is required" });
    }

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
        s.Loss_Qty
      FROM stock_History h
      JOIN stock s ON h.stock_Id = s.stock_id
      WHERE s.product_id = ?
        AND s.isActive = 1
    `;

    const queryParams = [product_id];

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
