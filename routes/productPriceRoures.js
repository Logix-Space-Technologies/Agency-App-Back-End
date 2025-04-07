const express = require('express');
const router = express.Router();
const { getProductPrice, addProductPrice, searchProductPrice, deleteProductPrice } = require('../controllers/productPriceController');

router.post('/',getProductPrice);
router.post('/add',addProductPrice);
router.post('/search',searchProductPrice);
router.post('/del',deleteProductPrice)


module.exports = router;