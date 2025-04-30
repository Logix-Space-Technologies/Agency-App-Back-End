const express = require('express');
const router = express.Router();
const {getProduct, addProduct, delProducts, searchProduct,updateProduct}=require('../controllers/productController');

router.post('/',getProduct);
router.post('/add',addProduct);
router.post('/del',delProducts);
router.post('/search',searchProduct);
router.post('/update',updateProduct);




module.exports = router;