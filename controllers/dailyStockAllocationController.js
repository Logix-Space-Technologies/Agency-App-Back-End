const pool = require('../config/db');

// Multiple 
exports.addDailyStockAllocation = async (req, res) => {
    try {
        const { marketing_staff_id, allocations } = req.body;
        // console.log(Input)
        console.log(req.body)

        if (!marketing_staff_id || !allocations || !Array.isArray(allocations)) {
            return res.status(400).json({ error: "Missing or invalid inputs" });
        }

        const date = new Date();

        const insertValues = allocations
            .filter(item => item.product_id && item.allocated_quantity)
            .map(item => [marketing_staff_id, item.product_id, item.allocated_quantity, date]);

        if (insertValues.length === 0) {
            return res.status(400).json({ error: "No valid allocations provided" });
        }

        const [result] = await pool.query(
            'INSERT INTO daily_stock_allocation (marketing_staff_id, product_id, allocated_quantity, date) VALUES ?',
            [insertValues]
        );

        res.json({ message: 'Daily stock allocations added successfully', rowsInserted: result.affectedRows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};


//view all
exports.viewAllDailyStockAllocation = async (req, res) => {
    try {
        const [DSA] = await pool.query('SELECT `daily_stock_id`, `marketing_staff_id`, `product_id`, `allocated_quantity`, `date`, `converted_to_sales` FROM `daily_stock_allocation` WHERE isActive = 1');
        res.json(DSA);
    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });

    }
}

//add dsa
exports.addDailyStockAllocation = async (req, res) => {
    try {
      console.log(req.body);
      const { marketing_staff_id, allocations } = req.body;
  
      if (!marketing_staff_id) {
        return res.status(400).json({ error: "marketing staff id required" });
      }
  
      if (!Array.isArray(allocations) || allocations.length === 0) {
        return res.status(400).json({ error: "allocations are required" });
      }
  
      for (const alloc of allocations) {
        const { product_id, allocated_quantity } = alloc;
  
        if (!product_id || !allocated_quantity) {
          return res.status(400).json({ error: "product_id and allocated_quantity required in each allocation" });
        }
  
        await pool.query(
          'INSERT INTO `daily_stock_allocation` (`marketing_staff_id`, `product_id`, `allocated_quantity`, `date`, `isActive`, `converted_to_sales`) VALUES (?, ?, ?, now(), 1, 0)',
          [marketing_staff_id, product_id, allocated_quantity]
        );
      }
  
      res.json({ message: 'daily stock allocations added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error' });
    }
  };
  
  

//search

exports.searchDailyStockAllocation = async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) return res.status(400).json({ error: " Date  required" });
        const [result] = await pool.query('SELECT `daily_stock_id`, `marketing_staff_id`, `product_id`, `allocated_quantity`, `date` FROM `daily_stock_allocation`  WHERE `date` = ? AND `isActive` = 1',[date]);
        res.json(result);

    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}

// search Individual
exports.searchDailyStockAllocationIndividual = async (req, res) => {
    try {
        const { date,marketing_staff_id } = req.body;
        if (!date) return res.status(400).json({ error: " Date  required" });
        
        const [result] = await pool.query('SELECT `daily_stock_id`, `marketing_staff_id`, d.`product_id`, p.product_name, p.mrp,`allocated_quantity`, `date` FROM `daily_stock_allocation` d JOIN products p on p.product_id=d.product_id  WHERE d.`date` = ? and d.marketing_staff_id=? AND d.`isActive` = 1',[date,marketing_staff_id]);
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
        const [result] = await pool.query('UPDATE `daily_stock_allocation` SET `isActive` = 0 WHERE `daily_stock_id`= ?', [daily_stock_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Record not found or already deleted' });
        }
        res.json({ message: 'daily stock deleted successfully', daily_stock_id: result.insertId });

    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}