const express = require('express');
const { getSuppliers, getProducts, createPurchase,getAllPurchases, createPurchaseNew, getDamagedItems, requestReplacement, getReplacementHistory } = require('../controllers/purchaseController');
const router = express.Router();


// router.post('/',viewAllPurchase);
router.post('/purchases',createPurchase);
router.post('/suppliers',getSuppliers);
router.post('/products',getProducts);
router.post('/getAllPurchases',getAllPurchases);


// Create new purchase
router.post('/purchases_new', createPurchaseNew);

// Get damaged items
router.get('/damaged-items', getDamagedItems);

// Request replacement
router.post('/request-replacement', requestReplacement);

// Get replacement history
router.get('/replacement-history',getReplacementHistory);



module.exports = router;