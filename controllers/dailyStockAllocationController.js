const pool = require('../config/db');
const { getISTTimestamp } = require('../utils/dateUtils');
const { logUserActivity } = require("../utils/logUserActivity");


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
            WHERE dsa.product_id = ? AND dsa.date = ? AND dsa.converted_to_sales = 0 AND dsa.isActive = 1 
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
            WHERE s.isActive=1 AND  s.product_id = ? AND s.sale_date = ? 
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
    let connection;
    try {
      const { marketing_staff_id, saleDate, allocations, addedBy} = req.body;

      if (!marketing_staff_id) {
        return res.status(400).json({ error: "marketing staff id required" });
      }
      if (!saleDate) {
        return res.status(400).json({ error: "Sale date required" });
      }
      if (!Array.isArray(allocations) || allocations.length === 0) {
        return res.status(400).json({ error: "allocations are required" });
      }
      for (const alloc of allocations) {
        if (!alloc.product_id || !alloc.allocated_quantity) {
          return res.status(400).json({ error: "product_id and allocated_quantity required in each allocation" });
        }
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      for (const alloc of allocations) {
        const { product_id, allocated_quantity } = alloc;

        await connection.execute(
          'INSERT INTO `daily_stock_allocation` (`marketing_staff_id`, `product_id`, `allocated_quantity`, `date`, `addedDate`,  `isActive`, `converted_to_sales`, `addedBy`, `created`) VALUES (?, ?, ?, ? ,now(), 1, 0, ?, ?)',
          [marketing_staff_id, product_id, allocated_quantity, saleDate, addedBy, getISTTimestamp()]
        );
      }

      await connection.commit();
      connection.release();
      connection = null;

        await logUserActivity({
        req,
        user_id : addedBy,
        action: `Daily stock allocation added - ${marketing_staff_id}`
        });

      res.json({ message: 'daily stock allocations added successfully' });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error(error);
      res.status(500).json({ error: 'Database error' });
    } finally {
      if (connection) connection.release();
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
// exports.searchDailyStockAllocationIndividual = async (req, res) => {
//     try {
//         const { date,marketing_staff_id } = req.body;
//         if (!date) return res.status(400).json({ error: " Date  required" });
        
//         const [result] = await pool.query('SELECT `daily_stock_id`, `marketing_staff_id`, d.`product_id`, p.product_name, p.mrp, ppp.marketing_selling_price,ppp.direct_selling_price,ppp.whole_sale_price ,`allocated_quantity`, `date`,d.`isActive`, d.`converted_to_sales` FROM `daily_stock_allocation` d JOIN products p on p.product_id=d.product_id JOIN product_prices ppp on ppp.product_id=p.product_id  WHERE d.`date` = ? and d.marketing_staff_id=? AND d.`isActive` = 1 and ppp.isActive=1',[date,marketing_staff_id]);
//         res.json(result);

//     }catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Database error' });
//     }
// }


// search Individual / Summary
exports.searchDailyStockAllocationIndividual = async (req, res) => {
  try {
    const { date, marketing_staff_id } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date required" });
    }

    // CASE 1: Date + Staff selected
    if (marketing_staff_id) {

      const [result] = await pool.query(
        `
        SELECT 
          d.daily_stock_id,
          d.marketing_staff_id,
          d.product_id,
          p.product_name,
          p.mrp,
          ppp.marketing_selling_price,
          ppp.direct_selling_price,
          ppp.whole_sale_price,
          d.allocated_quantity,
          d.date,
          d.isActive,
          d.converted_to_sales
        FROM daily_stock_allocation d
        JOIN products p 
          ON p.product_id = d.product_id
        JOIN product_prices ppp 
          ON ppp.product_id = p.product_id
        WHERE 
          d.date = ?
          AND d.marketing_staff_id = ?
          AND d.isActive = 1
          AND ppp.isActive = 1
        `,
        [date, marketing_staff_id]
      );

      return res.json({
        type: "details",
        data: result
      });
    }

    // CASE 2: Only Date selected
    const [summary] = await pool.query(
      `
      SELECT
        u.user_id,
        u.name,
        d.marketing_staff_id,
        COUNT(d.daily_stock_id) AS total_allocations,
        SUM(
          CASE 
            WHEN d.converted_to_sales = 1 THEN 1
            ELSE 0
          END
        ) AS sold_count,
        SUM(
          CASE 
            WHEN d.converted_to_sales = 0 THEN 1
            ELSE 0
          END
        ) AS pending_count
      FROM daily_stock_allocation d
      JOIN users u
        ON u.user_id = d.marketing_staff_id
      WHERE
        d.date = ?
        AND d.isActive = 1
      GROUP BY d.marketing_staff_id
      ORDER BY u.name ASC
      `,
      [date]
    );

    return res.json({
      type: "summary",
      data: summary
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};
// delete
exports.deleteDailyStockAllocation = async (req,res)=>{
    try{
        const { dailyStockId, productId, allocatedQuantity, loggedInUserId} = req.body;
        if (!dailyStockId) return res.status(400).json({ error: "Daily stock id is required" });

        if (!productId) return res.status(400).json({ error: "Product id is required" });

        if (!allocatedQuantity || isNaN(allocatedQuantity)) return res.status(400).json({ error: "Allocated quantity is required and must be a number" });

        const [result] = await pool.query('UPDATE `daily_stock_allocation` SET `isActive` = 0 WHERE `daily_stock_id` = ? AND `product_id` = ?', [dailyStockId, productId]);
        
        if (result.affectedRows === 0 ) {
            return res.status(404).json({ error: 'Record not found or already deleted' });
        }
        // No stock update needed here: allocated_quantity is only a virtual
        // reservation against stock.quantity (see viewAllStocks / addSalesFromDailyAllocation),
        // it was never physically subtracted, so nothing needs to be added back.
        await logUserActivity({
            req,
            user_id :loggedInUserId,
            action: `Allocation data deleted - ${dailyStockId} (daily stock id)`
        });
      res.json({
        message:"Daily stock allocation deleted successfully",
        dailyStockId,
        productId,
        allocatedQuantity,
      });

    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}
