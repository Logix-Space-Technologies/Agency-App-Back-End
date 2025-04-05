const express = require('express');
const router = express.Router();
const { getCategories, addCategory, deleteCategory, searchCategory } = require('../controllers/categoryController');

router.post('/', getCategories);
router.post('/add', addCategory);
router.post('/delete', deleteCategory);
router.post('/search', searchCategory);

module.exports = router;
