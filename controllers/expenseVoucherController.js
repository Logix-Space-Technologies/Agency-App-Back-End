const pool = require('../config/db');
const { getISTTimestamp } = require('../utils/dateUtils');

// add expense voucher
exports.addExpenseVoucher = async (req, res) => {
    try {
        const {
            expense_category_id,
            description,
            amount,
            gst_amount = 0,
            expense_date,
            payment_method = 'cash',
            addedBy,
        } = req.body;

        if (!expense_category_id) return res.status(400).json({ error: "expense_category_id is required" });
        if (amount === undefined || amount === null || amount === "") return res.status(400).json({ error: "amount is required" });
        if (!expense_date) return res.status(400).json({ error: "expense_date is required" });

        const [result] = await pool.query(
            `INSERT INTO misc_expense_vouchers
                (expense_category_id, description, amount, gst_amount, expense_date, payment_method, addedBy, created, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [expense_category_id, description || null, amount, gst_amount, expense_date, payment_method, addedBy || null, getISTTimestamp()]
        );

        const voucher_id = result.insertId;
        const voucher_number = `EXP-${String(voucher_id).padStart(5, '0')}`;

        res.json({ message: 'Expense voucher created successfully', voucher_id, voucher_number });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

// list / search expense vouchers (date range + category filter, all matches returned for client-side pagination)
exports.searchExpenseVouchers = async (req, res) => {
    try {
        const { fromDate, toDate, expense_category_id } = req.body;

        let whereClause = ' WHERE v.isActive = 1 ';
        const params = [];

        if (fromDate && toDate) {
            whereClause += ' AND v.expense_date BETWEEN ? AND ? ';
            params.push(fromDate, toDate);
        }

        if (expense_category_id) {
            whereClause += ' AND v.expense_category_id = ? ';
            params.push(expense_category_id);
        }

        const [rows] = await pool.query(
            `SELECT
                v.voucher_id,
                CONCAT('EXP-', LPAD(v.voucher_id, 5, '0')) AS voucher_number,
                v.expense_category_id,
                c.expense_category_name,
                v.description,
                v.amount,
                v.gst_amount,
                v.expense_date,
                v.payment_method,
                v.created
             FROM misc_expense_vouchers v
             JOIN expense_categories c ON c.expense_category_id = v.expense_category_id
             ${whereClause}
             ORDER BY v.expense_date DESC, v.voucher_id DESC`,
            params
        );

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

// delete (void) expense voucher
exports.deleteExpenseVoucher = async (req, res) => {
    try {
        const { voucher_id } = req.body;
        if (!voucher_id) return res.status(400).json({ error: "voucher_id is required" });

        const [result] = await pool.query(
            'UPDATE misc_expense_vouchers SET isActive = 0 WHERE voucher_id = ?',
            [voucher_id]
        );
        if (result.affectedRows === 0) return res.status(400).json({ error: 'voucher not found' });
        res.json({ message: 'Expense voucher deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};
