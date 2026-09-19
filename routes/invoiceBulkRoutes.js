const express = require('express');
const {
    searchInvoices,
    startBulkDownload,
    getBulkDownloadStatus,
    getBulkDownloadResult,
} = require('../controllers/invoiceBulkController');
const router = express.Router();

router.post('/search', searchInvoices);
router.post('/bulkDownload/start', startBulkDownload);
router.get('/bulkDownload/status/:jobId', getBulkDownloadStatus);
router.get('/bulkDownload/result/:jobId', getBulkDownloadResult);

module.exports = router;
