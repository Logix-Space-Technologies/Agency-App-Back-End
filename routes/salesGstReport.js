const express = require('express');
const router = express.Router();
const { fetchGstReport } = require('../controllers/salesGstReportController');

router.post('/fetchGstReport', fetchGstReport);

module.exports = router;