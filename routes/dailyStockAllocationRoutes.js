const express = require('express');
const { viewAllDailyStockAllocation, addDailyStockAllocation, searchDailyStockAllocation,searchDailyStockAllocationIndividual, deleteDailyStockAllocation } = require('../controllers/dailyStockAllocationController');
const router = express.Router();

router.post('/',viewAllDailyStockAllocation);
router.post('/add',addDailyStockAllocation);
router.post('/search',searchDailyStockAllocation);
router.post('/searchInd',searchDailyStockAllocationIndividual);
router.post('/del',deleteDailyStockAllocation);



module.exports = router;