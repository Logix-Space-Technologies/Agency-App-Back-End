const express = require('express');
const { viewAllPurchase, addPurchase, searchPurchase, deletePurchase } = require('../controllers/purchaseController');
const router = express.Router();


router.post('/',viewAllPurchase);
router.post('/add',addPurchase);
router.post('/search',searchPurchase);
router.post('/del',deletePurchase);



module.exports = router;