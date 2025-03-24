const express = require('express');
const router = express.Router();
const { getCategories, addCategory, deleteCategory } = require('../controllers/categoryController');

router.post('/', getCategories);
router.post('/add', addCategory);
router.post('/delete', deleteCategory);

module.exports = router;
