const pool = require('../config/db');

// Get All Categories
exports.getCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT category_id, category_name FROM categories WHERE isActive = 1');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

// Add New Category
exports.addCategory = async (req, res) => {
    try {
        const {category_name} = req.body;
        if (!category_name) return res.status(400).json({ error: "Category_name required" });

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

        const [result] = await pool.query('UPDATE `categories` SET `isActive` = 0 WHERE `category_id`= ?', [category_id]);
        if (result.affectedRows === 0) return res.status(400).json({ error: 'Category not found' });

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};


// Add Serach Category
exports.searchCategory = async (req, res) => {
    try {
        const { category_name } = req.body;
        if (!category_name) return res.status(400).json({ error: "Category name is required" });

        const [result] = await pool.query('SELECT `category_id`, `category_name` FROM `categories` WHERE `category_name`=? AND `isActive` = 1', [category_name]);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

//update category
exports.updateCategory = async (req, res) => {
    try {
        const { category_id, category_name  } = req.body;
        console.log(category_id, category_name);
        if (!category_id) return res.status(400).json({ error: "Category ID is required" });
        if (!category_name) return res.status(400).json({ error: "Category Name is required" });
        
        // const [result] = await pool.query('UPDATE `categories` SET `category_name` = ? WHERE `category_id`= ?', [category_name, category_id]);
        // if (result.affectedRows === 0) return res.status(400).json({ error: 'Category not found' });

        // res.json({ message: 'Category updated successfully' });

        const sql = "UPDATE `categories` SET `category_name` = ? WHERE `category_id`= ?";

        const [result] = await pool.query(sql, [category_name, category_id]);
        res.json({
          message: "Category updated successfully",
          category_id: result.insertId,
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};