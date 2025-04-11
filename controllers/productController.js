const pool = require('../config/db');


//get all products
exports.getProduct = async (req, res) => {
    try {
        const [products] = await pool.query('SELECT product_id, product_name, category_id, brand_id, mrp, description, expiry_date, product_image, created_at FROM products');
        res.json(products);


    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
}

//add
exports.addProduct = async (req, res) => {
    try {
        const { product_name, category_id,
            brand_id,
            mrp,
            description,
            expiry_date,
            product_image } = req.body;
        if (!product_name) return res.status(400).json({ error: "product_name required" });
        const [result] = await pool.query(`INSERT INTO products  (product_name, category_id, brand_id, mrp, description, expiry_date, product_image) VALUES (?, ?, ?, ?, ?, ?, ?) `, [product_name, category_id, brand_id, mrp, description, expiry_date, product_image]);

        res.json({ message: 'Product added successfully', product_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });

    }
}

// delete
exports.delProducts = async (req, res) => {
    try {
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ error: "product id required" });

        const [result] = await pool.query('DELETE FROM `products` WHERE `product_id`= ?', [product_id]);
        if (result.affectedRows === 0) return res.status(400).json({ error: "product not found" });
        res.json({ message: 'product deleted successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });

    }
}

//search
exports.searchProduct = async (req, res) => {
    try {
        const { product_name } = req.body;

        if (!product_name) {
            return res.status(400).json({ error: "Product name is required" });
        }

        const [result] = await pool.query(
            `SELECT p.product_id, p.product_name, c.category_name, b.brand_name, p.mrp, p.description, p.expiry_date, p.product_image, p.created_at
            FROM products p
            JOIN categories c ON c.category_id = p.category_id
            JOIN brands b ON b.brand_id = p.brand_id
            WHERE p.product_name = ?`,
            [product_name]
        );

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};
