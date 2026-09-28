const express = require('express');
const { generateDailyStockAuditReport } = require('../controllers/dailyStockAuditController');
const router = express.Router();

router.post('/report', generateDailyStockAuditReport);

module.exports = router;
