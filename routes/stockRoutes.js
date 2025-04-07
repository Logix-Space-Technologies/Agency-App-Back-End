const express=require('express');
const router=express.Router();
const {getStock}=require('../controllers/stockController');

router.post('/',getStock);

module.exports=router;