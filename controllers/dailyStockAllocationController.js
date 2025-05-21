const pool = require('../config/db');



//view all
exports.getAllocationByStaffAndDate = async (req, res) => {

    const { staff_id, date } = req.body;

    if (!staff_id || !date) {
        return res.status(400).json({ message: "staff_id and date are required" });
    }

    try {
        const [rows] = await pool.query(`
            SELECT 
                dsa.daily_stock_id,
                dsa.marketing_staff_id,
                dsa.product_id,
                dsa.allocated_quantity,
                dsa.date,
                dsa.isActive AS allocation_isActive,
                dsa.converted_to_sales,
                
                p.product_name,
                p.category_id,
                p.brand_id,
                p.mrp,
                p.description,
                p.expiry_date,
                p.product_image,
                p.isActive AS product_isActive,

                u.name AS staff_name,
                u.profile_avathar,
                u.role,
                u.phone,
                u.email,
                u.Place_Of_Allocation,
                u.isActive AS user_isActive

            FROM daily_stock_allocation dsa
            JOIN products p ON dsa.product_id = p.product_id
            JOIN users u ON dsa.marketing_staff_id = u.user_id
            WHERE dsa.marketing_staff_id = ? AND dsa.date = ? 
        `, [staff_id, date]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching staff allocation:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};




// exports.getAllocationByProductAndDate = async (req, res) => {
//     const { product_id, date } = req.body;

//     if (!product_id || !date) {
//         return res.status(400).json({ message: "product_id and date are required" });
//     }

//     try {
//         const [rows] = await pool.query(`
//             SELECT 
//                 dsa.daily_stock_id,
//                 dsa.marketing_staff_id,
//                 dsa.product_id,
//                 dsa.allocated_quantity,
//                 dsa.date,
//                 dsa.isActive AS allocation_isActive,
//                 dsa.converted_to_sales,

//                 p.product_name,
//                 p.category_id,
//                 p.brand_id,
//                 p.mrp,
//                 p.description,
//                 p.expiry_date,
//                 p.product_image,
//                 p.isActive AS product_isActive,

//                 u.name AS staff_name,
//                 u.profile_avathar,
//                 u.role,
//                 u.phone,
//                 u.email,
//                 u.Place_Of_Allocation,
//                 u.isActive AS user_isActive

//             FROM daily_stock_allocation dsa
//             JOIN products p ON dsa.product_id = p.product_id
//             JOIN users u ON dsa.marketing_staff_id = u.user_id
//             WHERE dsa.product_id = ? AND dsa.date = ?
//         `, [product_id, date]);

//         res.status(200).json(rows);
//     } catch (error) {
//         console.error('Error fetching product allocation:', error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

exports.getAllocationByProductAndDate = async (req, res) => {
    const { product_id, date } = req.body;

    if (!product_id || !date) {
        return res.status(400).json({ message: "product_id and date are required" });
    }

    try {
        // 1. Allocation details
        const [allocations] = await pool.query(`
            SELECT 
                dsa.daily_stock_id,
                dsa.marketing_staff_id,
                dsa.product_id,
                dsa.allocated_quantity,
                dsa.date,
                dsa.isActive AS allocation_isActive,
                dsa.converted_to_sales,

                p.product_name,
                p.category_id,
                p.brand_id,
                p.mrp,
                p.description,
                p.expiry_date,
                p.product_image,
                p.isActive AS product_isActive,

                u.name AS staff_name,
                u.profile_avathar,
                u.role,
                u.phone,
                u.email,
                u.Place_Of_Allocation,
                u.isActive AS user_isActive

            FROM daily_stock_allocation dsa
            JOIN products p ON dsa.product_id = p.product_id
            JOIN users u ON dsa.marketing_staff_id = u.user_id
            WHERE dsa.product_id = ? AND dsa.date = ? AND dsa.converted_to_sales =0
        `, [product_id, date]);

        // 2. Sales details
        const [sales] = await pool.query(`
            SELECT 
                s.sale_id,
                s.sale_type,
                s.marketing_staff_id,
                s.product_id,
                s.price_id,
                s.quantity_sold,
                s.amount_received,
                s.is_credit,
                s.sale_tracking_Id,
                s.sale_date,
                s.damaged_count,
                s.loss_count,
                s.is_settled,
                s.isActive,

                u.name AS staff_name,
                u.phone,
                u.email

            FROM sales s
            LEFT JOIN users u ON s.marketing_staff_id = u.user_id
            WHERE s.product_id = ? AND s.sale_date = ? 
        `, [product_id, date]);

        // 3. Summary totals
        const total_allocated_quantity = allocations.reduce((sum, row) => sum + row.allocated_quantity, 0);
        const total_sold_quantity = sales.reduce((sum, row) => sum + row.quantity_sold, 0);

        // 4. Final response
        res.status(200).json({
            allocations,
            sales,
            summary: {
                total_allocated_quantity,
                total_sold_quantity
            }
        });

    } catch (error) {
        console.error('Error fetching allocation and sales data:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};


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
        
        const [result] = await pool.query('SELECT `daily_stock_id`, `marketing_staff_id`, d.`product_id`, p.product_name, p.mrp, ppp.marketing_selling_price,ppp.direct_selling_price,ppp.whole_sale_price ,`allocated_quantity`, `date`,d.`isActive`, d.`converted_to_sales` FROM `daily_stock_allocation` d JOIN products p on p.product_id=d.product_id JOIN product_prices ppp on ppp.product_id=p.product_id  WHERE d.`date` = ? and d.marketing_staff_id=? AND d.`isActive` = 1 and ppp.isActive=1',[date,marketing_staff_id]);
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