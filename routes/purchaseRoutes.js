const express = require('express');
const { getSuppliers, getProducts, createPurchase,getAllPurchases } = require('../controllers/purchaseController');
const router = express.Router();


// router.post('/',viewAllPurchase);
router.post('/purchases',createPurchase);
router.post('/suppliers',getSuppliers);
router.post('/products',getProducts);
router.post('/getAllPurchases',getAllPurchases);



module.exports = router;