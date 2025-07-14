const express = require('express');
const router = express.Router();
const { getCategories, addCategory, deleteCategory, searchCategory, updateCategory} = require('../controllers/categoryController');

router.post('/', getCategories);
router.post('/add', addCategory);
router.post('/delete', deleteCategory);
router.post('/search', searchCategory);
router.post('/update', updateCategory);

module.exports = router;
