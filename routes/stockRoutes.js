const express = require('express');
const { viewAllStocks, addStocks, searchStock, deleteStock, stockHistory, saveOpeningClosingBalance, viewOpeningClosingStock} = require('../controllers/stockController');
const router = express.Router();


router.post('/',viewAllStocks);
router.post('/add',addStocks);
router.post('/search',searchStock);
router.post('/del',deleteStock);
router.post('/stockHistory', stockHistory);
router.post('/openingClosingStock', saveOpeningClosingBalance);
router.post('/viewOpeningClosing', viewOpeningClosingStock);

module.exports = router;