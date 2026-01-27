const express = require('express');
const router = express.Router();
const { getProductPrice, addProductPrice, searchProductPrice, deleteProductPrice, updateProductPrice, getProductPriceForPrint} = require('../controllers/productPriceController');

router.post('/',getProductPrice);
router.post('/add',addProductPrice);
router.post('/search',searchProductPrice);
router.post('/del',deleteProductPrice)
router.post('/update',updateProductPrice)
router.post('/print', getProductPriceForPrint);


module.exports = router;