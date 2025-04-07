const express = require('express');
const router = express.Router();
const {getProduct, addProduct, delProducts, searchProduct}=require('../controllers/productController');

router.post('/',getProduct);
router.post('/add',addProduct);
router.post('/del',delProducts);
router.post('/search',searchProduct);




module.exports = router;