const pool = require('../config/db');

// View all stocks with complete information
exports.viewAllStocks = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.product_id,
                p.product_name,
                p.category_id,
                c.category_name,
                s.stock_id,
                s.quantity AS stock_quantity,
                COALESCE(s.Damage_Qty, 0) AS Damage_Qty,
                COALESCE(s.Loss_Qty, 0) AS Loss_Qty,
                pp.price_id,
                COALESCE(pp.purchase_price, 0) AS purchase_price,
                COALESCE(pp.marketing_selling_price, 0) AS marketing_selling_price,
                COALESCE(pp.direct_selling_price, 0) AS direct_selling_price,
                COALESCE(pp.whole_sale_price, 0) AS whole_sale_price,
                COALESCE(SUM(dsa.allocated_quantity), 0) AS allocated_stock
            FROM 
                stock s
            JOIN 
                products p ON s.product_id = p.product_id
            JOIN 
                product_prices pp ON s.price_id = pp.price_id
            LEFT JOIN 
                categories c ON p.category_id = c.category_id
            LEFT JOIN 
                daily_stock_allocation dsa ON s.product_id = dsa.product_id AND dsa.converted_to_sales = 0
            WHERE 
                s.isActive = 1
            GROUP BY 
                s.stock_id, p.product_id, pp.price_id
        `;
        
        const [stocks] = await pool.query(query);
        
        // Calculate total stock (stock + allocated)
        const stocksWithTotal = stocks.map(stock => ({
            ...stock,
            stock_total: Number(stock.stock_quantity) - Number(stock.allocated_stock),
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