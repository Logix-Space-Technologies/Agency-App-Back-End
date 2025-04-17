const express = require('express');
const { getAllSales, addSales, searchSales, deleteSales,addSalesFromDailyAllocation,getProductSaleMeta } = require('../controllers/salesController');
const router = express.Router();


router.post('/',getAllSales);
router.post('/add',addSales);
router.post('/search',searchSales);
router.post('/del',deleteSales);
router.post('/create_sales_from_dsa',addSalesFromDailyAllocation);
router.post('/meta',getProductSaleMeta);


module.exports = router;