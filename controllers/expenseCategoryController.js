const pool = require('../config/db');

// get all expense categories
exports.getExpenseCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT expense_category_id, expense_category_name FROM expense_categories WHERE isActive = 1 ORDER BY expense_category_name');
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

// add expense category
exports.addExpenseCategory = async (req, res) => {
    try {
        const { expense_category_name } = req.body;
        if (!expense_category_name) return res.status(400).json({ error: "expense_category_name required" });

        const [result] = await pool.query(
            'INSERT INTO expense_categories (expense_category_name) VALUES (?)',
            [expense_category_name]
        );
        res.json({ message: 'expense category added successfully', expense_category_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

// update expense category
exports.updateExpenseCategory = async (req, res) => {
    try {
        const { expense_category_id, expense_category_name } = req.body;
        if (!expense_category_id || !expense_category_name) {
            return res.status(400).json({ error: "expense_category_id and expense_category_name required" });
        }

        const [result] = await pool.query(
            'UPDATE expense_categories SET expense_category_name = ? WHERE expense_category_id = ?',
            [expense_category_name, expense_category_id]
        );
        if (result.affectedRows === 0) return res.status(400).json({ error: 'expense category not found' });
        res.json({ message: 'expense category updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

// delete expense category
exports.deleteExpenseCategory = async (req, res) => {
    try {
        const { expense_category_id } = req.body;
        if (!expense_category_id) return res.status(400).json({ error: "expense_category_id required" });

        const [result] = await pool.query(
            'UPDATE expense_categories SET isActive = 0 WHERE expense_category_id = ?',
            [expense_category_id]
        );
        if (result.affectedRows === 0) return res.status(400).json({ error: 'expense category not found' });
        res.json({ message: 'expense category deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};
