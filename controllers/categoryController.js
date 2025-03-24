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

//delete category
exports.deleteCategory = async (req, res) => {
    try {
        const { category_id } = req.body;
        if (!category_id) return res.status(400).json({ error: "Category ID is required" });

        const [result] = await pool.query('DELETE FROM `categories` WHERE `category_id`= ?', [category_id]);
        if (result.affectedRows === 0) return res.status(400).json({ error: 'Category not found' });

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
}

