const express = require('express');
const router = express.Router();
const { getCashFlow, fetchProfitLoss } = require('../controllers/cashFlowController');

router.post('/all', getCashFlow);
router.post('/fetchProfitLoss', fetchProfitLoss);


module.exports = router;