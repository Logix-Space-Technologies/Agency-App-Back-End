const express = require('express');
const router = express.Router();
const { getProductPrice, addProductPrice, searchProductPrice, deleteProductPrice, updateProductPrice } = require('../controllers/productPriceController');

router.post('/',getProductPrice);
router.post('/add',addProductPrice);
router.post('/search',searchProductPrice);
router.post('/del',deleteProductPrice)
router.post('/update',updateProductPrice)


module.exports = router;