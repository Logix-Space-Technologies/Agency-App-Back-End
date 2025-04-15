const express = require('express');
const { viewAllStocks, addStocks, searchStock, deleteStock } = require('../controllers/stockController');
const router = express.Router();


router.post('/',viewAllStocks);
router.post('/add',addStocks);
router.post('/search',searchStock);
router.post('/del',deleteStock);



module.exports = router;