const express = require('express');
const { getBackdatedEntries } = require('../controllers/backdatedEntriesController');
const router = express.Router();

router.post('/list', getBackdatedEntries);

module.exports = router;
