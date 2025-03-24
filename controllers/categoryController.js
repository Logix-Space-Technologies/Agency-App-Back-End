const pool = require('../config/db');

// Get All Categories
exports.getCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT category_id, category_name FROM categories');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

// Add New Category
exports.addCategory = async (req, res) => {
    try {
        const { category_name } = req.body;
        if (!category_name) return res.status(400).json({ error: "Category name is required" });

        const [result] = await pool.query('INSERT INTO categories (category_name) VALUES (?)', [category_name]);
        res.json({ message: 'Category added successfully', category_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};
