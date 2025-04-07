const pool=require('../config/db');

//Get All Stocks
exports.getStock=async(req,res)=>{
    try {
        const [stocks]=await pool.query('SELECT stock_id, product_id,price_id,quantity,added_date FROM  stock');
        res.json(stocks);
    }catch (error){
        res.status(500).json({error:'Database error'});
    }
};