const express = require('express');
const router = express.Router();
const { getBrands, addBrand, searchBrand, deleteBrand,editBrand } = require('../controllers/brandController');

router.post('/', getBrands);
router.post('/add', addBrand);
router.post('/search', searchBrand);
router.post('/delete', deleteBrand);
router.post('/update', editBrand);

module.exports = router;
