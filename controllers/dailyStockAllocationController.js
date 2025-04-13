const pool = require('../config/db');

//view all
exports.viewAllDailyStockAllocation = async (req, res) => {
    try {
        const [DSA] = await pool.query('SELECT `daily_stock_id`, `marketing_staff_id`, `product_id`, `allocated_quantity`, `date` FROM `daily_stock_allocation`');
        res.json(DSA);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });

    }
}

//add dsa
exports.addDailyStockAllocation = async (req, res) => {
    try {
        const { marketing_staff_id, product_id, allocated_quantity } = req.body;
        if (!marketing_staff_id) return res.status(400).json({ error: "marketing staff id required" });
        const date = new Date();

        const [result] = await pool.query('INSERT INTO `daily_stock_allocation`( `marketing_staff_id`, `product_id`, `allocated_quantity`, `date`) VALUES(?,?,?,now())',
            [marketing_staff_id, product_id, allocated_quantity, date]);
        res.json({ message: 'daily stock added successfully', daily_stock_id: result.insertId });


    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}

//search

exports.searchDailyStockAllocation = async (req, res) => {
    try {
        const { daily_stock_id } = req.body;
        if (!daily_stock_id) return res.status(400).json({ error: "daily stock id name required" });
        const [result] = await pool.query('SELECT `daily_stock_id`, `marketing_staff_id`, `product_id`, `allocated_quantity`, `date` FROM `daily_stock_allocation`  WHERE `daily_stock_id` = ?',[daily_stock_id]);
        res.json(result);

    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}

// delete
exports.deleteDailyStockAllocation = async (req,res)=>{
    try{
        const { daily_stock_id } = req.body;
        if (!daily_stock_id) return res.status(400).json({ error: "daily stock id is required" });
        const [result] = await pool.query('DELETE FROM `daily_stock_allocation` WHERE `daily_stock_id`=?', [daily_stock_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Record not found or already deleted' });
        }
        res.json({ message: 'daily stock deleted successfully', daily_stock_id: result.insertId });

    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}