const express = require('express');
const {
    addExpenseVoucher,
    searchExpenseVouchers,
    deleteExpenseVoucher,
    updateExpenseVoucher,
} = require('../controllers/expenseVoucherController');
const router = express.Router();

router.post('/add', addExpenseVoucher);
router.post('/search', searchExpenseVouchers);
router.post('/delete', deleteExpenseVoucher);
router.post('/update', updateExpenseVoucher);

module.exports = router;
