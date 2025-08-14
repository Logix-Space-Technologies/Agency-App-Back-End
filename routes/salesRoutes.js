const express = require('express');
const { fecthAllCreditReportCustomers,fetchDailyDataForPrint,cashReport,incCredit, fecthAllCreditReportUser, fecthAllCreditReport,fecthAllCustomers,fecthLatestPrices,addDirectSales,getAllSales, addSales, searchSales, deleteSales,addSalesFromDailyAllocation,getProductSaleMeta,getSaleDetails, fetchFinalSaleListBySearchValue, fetchSalesDataForPrintByID, fetchDirectSaleListByDate, fetchDirectSalesDataForPrintByID,submitAllProductReturns,getSaleDetailsForReturn, deleteDirectSaleProduct, deleteAllDirectSaleProducts} = require('../controllers/salesController');
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
router.post('/user-credit', fecthAllCreditReportUser);
router.post('/customer-credit', fecthAllCreditReportCustomers);
router.post('/inc-credit', incCredit);
router.post('/cashReport', cashReport);
router.post('/fetchDailyDataForPrint', fetchDailyDataForPrint);
router.post('/fetchFinalSaleListBySearchValue', fetchFinalSaleListBySearchValue);
router.post('/fetchSalesDataForPrintByID', fetchSalesDataForPrintByID);
router.post('/fetchDirectSaleListByDate', fetchDirectSaleListByDate);
router.post('/fetchDirectSalesDataForPrintByID', fetchDirectSalesDataForPrintByID);
router.post('/submitReturn', submitAllProductReturns);
router.get('/salesReturnDetails/:sale_tracking_id/:type', getSaleDetailsForReturn);
router.post('/deleteDirectSaleProduct', deleteDirectSaleProduct);
router.post('/deleteAllDirectSaleProducts', deleteAllDirectSaleProducts);

module.exports = router;