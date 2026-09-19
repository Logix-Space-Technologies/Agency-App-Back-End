const express = require('express');
const { searchInvoices, downloadInvoicesZip } = require('../controllers/invoiceBulkController');
const router = express.Router();

router.post('/search', searchInvoices);
router.post('/downloadZip', downloadInvoicesZip);

module.exports = router;
