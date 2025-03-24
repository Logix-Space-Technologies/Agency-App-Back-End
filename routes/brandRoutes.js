const express = require('express');
const router = express.Router();
const { getBrands, addBrand } = require('../controllers/brandController');

router.get('/', getBrands);
router.post('/add', addBrand);

module.exports = router;
