const pool = require('../config/db');

//view all
exports.getAllSales = async (req, res) => {
    try {
        const [sales] = await pool.query('SELECT sale_id, sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count FROM sales WHERE isActive = 1');
        res.json(sales);
    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}


// Convert daily stock allocation to sales
// Add sales using daily stock allocation + custom values per product
exports.addSalesFromDailyAllocation = async (req, res) => {
    try {
        const {
            sale_type = 'marketing',
            marketing_staff_id,
            sale_date = new Date(),
            is_credit = 0,
            is_settled = 0,
            products = []
        } = req.body;

        if (!marketing_staff_id || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const [stockAllocations] = await pool.query(
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

        for (const item of products) {
            const {
                product_id,
                quantity_sold = 0,
                amount_received = 0,
                damaged_count = 0,
                loss_count = 0
            } = item;

            if (!allocationMap[product_id]) {
                console.warn(`No active allocation found for product_id ${product_id}`);
                continue;
            }

            const [priceRows] = await pool.query(
                `SELECT price_id 
                 FROM product_prices 
                 WHERE product_id = ? AND isActive = 1 AND effective_date <= ? 
                 ORDER BY effective_date DESC LIMIT 1`,
                [product_id, sale_date]
            );

            if (priceRows.length === 0) {
                console.warn(`No price found for product_id ${product_id}`);
                continue;
            }

            const price_id = priceRows[0].price_id;

            const [insertResult] = await pool.query(
                `INSERT INTO sales 
                (sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count) 
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
                    loss_count
                ]
            );

            // Mark allocation as converted
            await pool.query(
                `UPDATE daily_stock_allocation SET converted_to_sales = 1 WHERE daily_stock_id = ?`,
                [allocationMap[product_id].daily_stock_id]
            );

            salesResults.push({
                sale_id: insertResult.insertId,
                product_id,
                quantity_sold,
                amount_received
            });
        }

        res.json({ message: 'Sales added successfully', sales: salesResults });

    } catch (error) {
        console.error("Error in addSales:", error);
        res.status(500).json({ error: 'Database error' });
    }
};



//add sales
exports.addSales = async (req, res) => {
    try {
        const {
            sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count } = req.body;

        if (!product_id || !price_id) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const [result] = await pool.query(
            `INSERT INTO sales (  sale_type,  marketing_staff_id,  product_id,  price_id,  quantity_sold,  amount_received,  is_credit,  sale_date,  damaged_count,  is_settled,  loss_count ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count]
        );

        // Update stock
        await pool.query(`UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND price_id = ?`, [quantity_sold, product_id, price_id]);



        res.json({ message: 'Sale and stock added successfully', sale_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

//search
exports.searchSales = async (req, res) => {
    try {
        const { sale_id } = req.body;
        if (!sale_id) return res.status(400).json({ error: "sales id required" });
        const [result] = await pool.query('SELECT `sale_id`, `sale_type`, `marketing_staff_id`, `product_id`, `price_id`, `quantity_sold`, `amount_received`, `is_credit`, `sale_date`, `damaged_count`, `is_settled`, `loss_count` FROM`sales` WHERE `sale_id` = ? AND `isActive` = 1', [sale_id]);
        res.json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }

}

//delete
exports.deleteSales = async (req, res) => {
    try {
        const { sale_id } = req.body;
        if (!sale_id) return res.status(400).json({ error: "sales id is required" });

        const [result] = await pool.query('UPDATE sales SET isActive = 0 WHERE sale_id= ?', [sale_id]);
        if (result.affectedRows === 0) return res.status(400).json({ error: 'sales id not found' });
        res.json({ message: 'sales id deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}