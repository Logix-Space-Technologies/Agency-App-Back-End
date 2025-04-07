const pool = require('../config/db');

// get all product price

exports.getProductPrice = async(req,res)=>{
    try{
        const [product_prices]=await pool.query('SELECT price_id, product_id, purchase_price, marketing_selling_price, direct_selling_price, effective_date FROM product_prices');
        res.json(product_prices);
    }catch(error){
        res.status(500).json({ error: 'Database error' });

    }
}

// add

exports.addProductPrice = async (req, res) => {
    try {
        const {
            product_id,
            purchase_price,
            marketing_selling_price,
            direct_selling_price,
            effective_date
        } = req.body;

        if (!product_id) return res.status(400).json({ error: "product_id is required" });

        const [result] = await pool.query(
            `INSERT INTO product_prices (product_id, purchase_price, marketing_selling_price, direct_selling_price, effective_date)
             VALUES (?, ?, ?, ?, ?)`,
            [product_id, purchase_price, marketing_selling_price, direct_selling_price, effective_date]
        );

        res.json({ message: 'Product price added successfully', price_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

//search

exports.searchProductPrice = async (req, res) => {
    try {
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ error: "product id is required" });

        const [result] = await pool.query('SELECT * FROM product_prices WHERE product_id = ?', [product_id]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};


//delete
exports.deleteProductPrice = async(req,res)=>{
    try{
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ error: "product id is required" });

        const [result] = await pool.query('DELETE FROM product_prices WHERE product_id= ?',[product_id]);
        if (result.affectedRows === 0) return res.status(400).json({ error: 'product price not found' });
        res.json({ message: 'product price deleted successfully' });


    }catch(error){
        res.status(500).json({ error: 'Database error' });

    }
}