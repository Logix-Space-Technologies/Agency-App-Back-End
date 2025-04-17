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