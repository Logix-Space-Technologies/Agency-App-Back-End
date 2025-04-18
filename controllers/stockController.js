const pool = require('../config/db');


//view all stock
exports.viewAllStocks = async (req, res) => {
    try {
        const [stock] = await pool.query('SELECT `stock_id`, `product_id`, `price_id`, `quantity`, `added_date` FROM `stock` WHERE isActive = 1')
        res.json(stock)
    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}

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