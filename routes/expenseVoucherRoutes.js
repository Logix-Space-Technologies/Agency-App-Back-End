const express = require('express');
const {
    addExpenseVoucher,
    searchExpenseVouchers,
    deleteExpenseVoucher,
} = require('../controllers/expenseVoucherController');
const router = express.Router();

router.post('/add', addExpenseVoucher);
router.post('/search', searchExpenseVouchers);
router.post('/delete', deleteExpenseVoucher);

module.exports = router;
