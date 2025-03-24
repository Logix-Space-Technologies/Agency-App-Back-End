const express = require('express');
const router = express.Router();
const { getBrands, addBrand, searchBrand } = require('../controllers/brandController');

router.get('/', getBrands);
router.post('/add', addBrand);
router.post('/search', searchBrand);

module.exports = router;
