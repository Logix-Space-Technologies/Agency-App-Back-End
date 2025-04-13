const express = require('express');
const { getAllSales, addSales, searchSales, deleteSales } = require('../controllers/salesController');
const router = express.Router();


router.post('/',getAllSales);
router.post('/add',addSales);
router.post('/search',searchSales);
router.post('/del',deleteSales);


module.exports = router;