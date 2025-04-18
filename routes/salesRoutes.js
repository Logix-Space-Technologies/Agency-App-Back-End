const express = require('express');
const { getAllSales, addSales, searchSales, deleteSales,addSalesFromDailyAllocation,getProductSaleMeta,getSaleDetails } = require('../controllers/salesController');
const router = express.Router();


router.post('/',getAllSales);
router.post('/add',addSales);
router.post('/search',searchSales);
router.post('/del',deleteSales);
router.post('/create_sales_from_dsa',addSalesFromDailyAllocation);
router.post('/meta',getProductSaleMeta);
router.get('/details/:sale_tracking_id', getSaleDetails);


module.exports = router;