const express = require('express');
const { getSuppliers, getProducts, createPurchase,getAllPurchases,
     createPurchaseNew, getDamagedItems, requestReplacement,
      getReplacementHistory, createEnhancedPurchase,
    calculateFreebies,
    getEnhancedDamagedItems, getPurchaseBills, getTransactionTypes, purchaseSettlement, getAllPurchasesByValues, deletePurchase, getPurchaseSettlements } = require('../controllers/purchaseController');
const router = express.Router();


// router.post('/',viewAllPurchase);
router.post('/purchases',createPurchase);
router.post('/suppliers',getSuppliers);
router.post('/products',getProducts);
router.post('/getAllPurchases',getAllPurchases);
router.post('/viewBills', getPurchaseBills);
router.post('/transactionTypes', getTransactionTypes);
router.post('/addSettlemet', purchaseSettlement);
router.post('/getAllPurchasesByValues', getAllPurchasesByValues);
router.post('/deletePurchase', deletePurchase);
router.post('/getSettlements', getPurchaseSettlements);

// Create new purchase
router.post('/purchases_new', createPurchaseNew);

// Get damaged items
router.post('/damaged-items', getDamagedItems);

// Request replacement
router.post('/request-replacement', requestReplacement);

// Get replacement history
router.post('/replacement-history',getReplacementHistory);



// New enhanced routes
router.post('/enhanced-purchase', createEnhancedPurchase);
router.post('/calculate-freebies', calculateFreebies);
router.get('/enhanced-damaged-items', getEnhancedDamagedItems);


module.exports = router;