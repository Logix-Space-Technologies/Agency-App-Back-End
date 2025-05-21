const express = require('express');
const { getAllocationByProductAndDate,getAllocationByStaffAndDate, viewAllDailyStockAllocation, addDailyStockAllocation, searchDailyStockAllocation,searchDailyStockAllocationIndividual, deleteDailyStockAllocation } = require('../controllers/dailyStockAllocationController');
const router = express.Router();

router.post('/',viewAllDailyStockAllocation);
router.post('/add',addDailyStockAllocation);
router.post('/search',searchDailyStockAllocation);
router.post('/searchInd',searchDailyStockAllocationIndividual);
router.post('/del',deleteDailyStockAllocation);
router.post('/getAllocationByProductAndDate',getAllocationByProductAndDate);
router.post('/getAllocationByStaffAndDate',getAllocationByStaffAndDate);




module.exports = router;