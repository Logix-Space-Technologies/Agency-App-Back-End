const express = require('express');
const router = express.Router();
const { getBrands, addBrand, searchBrand, deleteBrand } = require('../controllers/brandController');

router.post('/', getBrands);
router.post('/add', addBrand);
router.post('/search', searchBrand);
router.post('/delete', deleteBrand);

module.exports = router;
