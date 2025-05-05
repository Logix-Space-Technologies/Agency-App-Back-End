const express = require('express');
const { fecthAllCreditReport,fecthAllCustomers,fecthLatestPrices,addDirectSales,getAllSales, addSales, searchSales, deleteSales,addSalesFromDailyAllocation,getProductSaleMeta,getSaleDetails } = require('../controllers/salesController');
const router = express.Router();


router.post('/',getAllSales);
router.post('/fecthAllCreditReport',fecthAllCreditReport);

router.post('/add',addSales);
router.post('/search',searchSales);
router.post('/del',deleteSales);
router.post('/create_sales_from_dsa',addSalesFromDailyAllocation);
router.post('/meta',getProductSaleMeta);
router.get('/details/:sale_tracking_id', getSaleDetails);
router.post('/direct', addDirectSales);
router.post('/customers', fecthAllCustomers);
router.post('/latest_price', fecthLatestPrices);



module.exports = router;