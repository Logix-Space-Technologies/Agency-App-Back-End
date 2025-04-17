const pool = require('../config/db');


//view all
exports.viewAllPurchase = async (req, res) => {
    try {
        const [purchase] = await pool.query('SELECT `id`, `product_id`, `purchase_date`, `purchase_price`, `quantity`, `Invoice_Number`, `supplier_id` FROM `purchase` WHERE  isActive = 1')
        res.json(purchase)
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}

//add purchase
exports.addPurchase = async (req, res) => {
    try {
        const { product_id, purchase_price, quantity, Invoice_Number, supplier_id } = req.body
        if (!product_id) return res.status(400).json({ error: "product id required" })
        const [result] = await pool.query('INSERT INTO `purchase`( `product_id`, `purchase_date`, `purchase_price`, `quantity`, `Invoice_Number`, `supplier_id`, `isActive`) VALUES (?,now(),?,?,?,?,1)',
            [product_id, purchase_price, quantity, Invoice_Number, supplier_id])

        // update stock 
    await pool.query(`UPDATE stock SET quantity = quantity + ?, added_date = NOW()WHERE product_id = ?`, [quantity, product_id]);
        res.json({ message: 'purchase added,stock updated successfully', id: result.insertId });



    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}

//search purchase
exports.searchPurchase = async (req, res) => {
    try {
        const { id } = req.body
        if (!id) return res.status(400).json({ error: "id required" })
        const [result] = await pool.query('SELECT `id`, `product_id`, `purchase_date`, `purchase_price`, `quantity`, `Invoice_Number`, `supplier_id` FROM `purchase`  WHERE `id` = ? AND `isActive` = 1', [id])
        res.json(result)
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}


//delete purchase

exports.deletePurchase = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: " id required" })
        const [result] = await pool.query('UPDATE `purchase` SET `isActive` = 0 WHERE `id`=?', [id])
        if (result.affectedRows === 0) return res.status(400).json({ error: 'id not found' });
        res.json({ message: ' id deleted successfully' })
    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}