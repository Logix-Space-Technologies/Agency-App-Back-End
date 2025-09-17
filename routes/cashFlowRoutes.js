const express = require('express');
const router = express.Router();
const { getCashFlow } = require('../controllers/cashFlowController');

router.post('/all', getCashFlow);
// router.post('/sale', getSaleData);
// router.post('/purchase', getPurchaseData);
// router.post('/salary', getSalaryData);


module.exports = router;