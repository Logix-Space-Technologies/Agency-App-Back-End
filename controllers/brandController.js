const pool = require('../config/db');

// Get All Brands
exports.getBrands = async (req, res) => {
    try {
        const [brands] = await pool.query('SELECT brand_id, brand_name FROM brands');
        res.json(brands);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

// Search New Brand
exports.searchBrand = async (req, res) => {
    try {
        const { brand_name } = req.body;
        if (!brand_name) return res.status(400).json({ error: "Brand name is required" });

        const [result] = await pool.query('SELECT `brand_id`, `brand_name` FROM `brands` WHERE `brand_name`=?', [brand_name]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

// Add New Brand
exports.addBrand = async (req, res) => {
    try {
        const { brand_name } = req.body;
        if (!brand_name) return res.status(400).json({ error: "Brand name is required" });

        const [result] = await pool.query('INSERT INTO brands (brand_name) VALUES (?)', [brand_name]);
        res.json({ message: 'Brand added successfully', brand_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};