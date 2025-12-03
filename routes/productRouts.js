const express = require('express');
const router = express.Router();
const {getProduct, addProduct, delProducts, searchProduct,updateProduct, damagedProductSearch, getMiscDamagedProduct, addMiscDamagedProduct}=require('../controllers/productController');

router.post('/',getProduct);
router.post('/add',addProduct);
router.post('/del',delProducts);
router.post('/search',searchProduct);
router.post('/update',updateProduct);
router.post('/damagedProduct', damagedProductSearch);
router.post('/addMiscDamaged', addMiscDamagedProduct);
router.post('/getMiscDamagedProduct', getMiscDamagedProduct);




module.exports = router;