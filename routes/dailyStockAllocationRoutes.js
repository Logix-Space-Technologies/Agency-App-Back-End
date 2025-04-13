const express = require('express');
const { viewAllDailyStockAllocation, addDailyStockAllocation, searchDailyStockAllocation, deleteDailyStockAllocation } = require('../controllers/dailyStockAllocationController');
const router = express.Router();

router.post('/',viewAllDailyStockAllocation);
router.post('/add',addDailyStockAllocation);
router.post('/search',searchDailyStockAllocation);
router.post('/del',deleteDailyStockAllocation);



module.exports = router;