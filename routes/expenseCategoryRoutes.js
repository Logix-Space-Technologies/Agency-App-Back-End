const express = require('express');
const {
    getExpenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
} = require('../controllers/expenseCategoryController');
const router = express.Router();

router.post('/', getExpenseCategories);
router.post('/add', addExpenseCategory);
router.post('/update', updateExpenseCategory);
router.post('/delete', deleteExpenseCategory);

module.exports = router;
