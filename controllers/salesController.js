const pool = require('../config/db');


// Fetch allocated quantity and price for product sale calculation
exports.getProductSaleMeta = async (req, res) => {
    try {
        const { product_id, marketing_staff_id, sale_date } = req.body;
        console.log("Request Body:", req.body);

        if (!product_id || !marketing_staff_id || !sale_date) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Fetch allocated quantity
        const [allocationRows] = await pool.query(
            `SELECT allocated_quantity 
             FROM daily_stock_allocation 
             WHERE product_id = ? AND marketing_staff_id = ? AND date = ? AND isActive = 1`,
            [product_id, marketing_staff_id, sale_date]
        );

        if (allocationRows.length === 0) {
            return res.status(404).json({ error: "No allocation found" });
        }

        const allocated_quantity = allocationRows[0].allocated_quantity;

        // 2. Fetch latest active marketing_selling_price
        const [priceRows] = await pool.query(
            `SELECT marketing_selling_price 
             FROM product_prices 
             WHERE product_id = ? AND isActive = 1 AND effective_date <= ?
             ORDER BY effective_date DESC LIMIT 1`,
            [product_id, sale_date]
        );

        if (priceRows.length === 0) {
            return res.status(404).json({ error: "No price data found" });
        }

        const marketing_selling_price = priceRows[0].marketing_selling_price;

        // 3. Calculate total amount
        const amount = allocated_quantity * marketing_selling_price;

        console.log("Allocated Qty:", allocated_quantity);
        console.log("Selling Price:", marketing_selling_price);
        console.log("Amount:", amount);

        res.json({
            allocated_quantity,
            marketing_selling_price,
            amount
        });

    } catch (error) {
        console.error("Error in getProductSaleMeta:", error);
        res.status(500).json({ error: 'Database error' });
    }
};



//view all
exports.getAllSales = async (req, res) => {
    try {
        const [sales] = await pool.query('SELECT sale_id, sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count FROM sales WHERE isActive = 1');
        res.json(sales);
    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}


// Convert daily stock allocation to sales
// Add sales using daily stock allocation + custom values per product
const { v4: uuidv4 } = require('uuid');

 exports.addSalesFromDailyAllocation = async (req, res) => {
     try {
         const {
             sale_type = 'marketing',
             marketing_staff_id,
             sale_date = new Date(),
             products = [],
             amount_paid = 0 // Expecting the initial amount paid at the time of sale
         } = req.body;

         if (!marketing_staff_id || !Array.isArray(products) || products.length === 0) {
             return res.status(400).json({ error: "Required fields are missing" });
         }

         const [stockAllocations] = await pool.query(
             `SELECT daily_stock_id, product_id, allocated_quantity
              FROM daily_stock_allocation
              WHERE marketing_staff_id = ? AND converted_to_sales = 0 AND isActive = 1`,
             [marketing_staff_id]
         );

         const allocationMap = {};
         for (const stock of stockAllocations) {
             allocationMap[stock.product_id] = stock;
         }

         const salesResults = [];
         const sale_tracking_id = generateUniqueSaleTrackingId(); // Generate a unique ID for this entire sale
         let totalAmountReceivedForSale = 0;

         await pool.query(
             `INSERT INTO final_sale (sale_tracking_Id, TotalAmount, UserId, DateofTransaction, isSettled, AmountPaid)
              VALUES (?, ?, ?, ?, ?, ?)`,
             [sale_tracking_id, 0, marketing_staff_id, sale_date, parseFloat(amount_paid) >= 0 ? (parseFloat(amount_paid) >= 0 ? (parseFloat(amount_paid) > 0 ? 0 : 1) : 1) : 1, amount_paid] // Modified initial isSettled
         );

         // Insert the initial payment into sales_credit_history
         if (parseFloat(amount_paid) > 0) {
             await pool.query(
                 `INSERT INTO sales_credit_history (sale_tracking_Id, amount, creditedDate, isActive)
                  VALUES (?, ?, now(), ?)`,
                 [sale_tracking_id, amount_paid, 1]
             );
         }

         for (const item of products) {
             const {
                 product_id,
                 quantity_sold = 0,
                 amount_received = 0,
                 damaged_count = 0,
                 loss_count = 0
             } = item;

             totalAmountReceivedForSale += parseFloat(amount_received);

             if (!allocationMap[product_id]) {
                 console.warn(`No active allocation found for product_id ${product_id}`);
                 continue;
             }

             const [priceRows] = await pool.query(
                 `SELECT price_id
                  FROM product_prices
                  WHERE product_id = ? AND isActive = 1 AND effective_date <= ?
                  ORDER BY effective_date DESC LIMIT 1`,
                 [product_id, sale_date]
             );

             if (priceRows.length === 0) {
                 console.warn(`No price found for product_id ${product_id}`);
                 continue;
             }

             const price_id = priceRows[0].price_id;

             const isSettledItem = parseFloat(amount_paid) >= parseFloat(amount_received) ? 1 : 0; // isSettled for the individual item
             const isCredit = parseFloat(amount_paid) < parseFloat(amount_received) ? 1 : 0;

             const [insertResult] = await pool.query(
                 `INSERT INTO sales
                 (sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count, sale_tracking_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                 [
                     sale_type,
                     marketing_staff_id,
                     product_id,
                     price_id,
                     quantity_sold,
                     amount_received,
                     isCredit,
                     sale_date,
                     damaged_count,
                     isSettledItem, // Use isSettledItem here
                     loss_count,
                     sale_tracking_id
                 ]
             );

             // Mark allocation as converted
             await pool.query(
                 `UPDATE daily_stock_allocation SET converted_to_sales = 1 WHERE daily_stock_id = ?`,
                 [allocationMap[product_id].daily_stock_id]
             );

             salesResults.push({
                 sale_id: insertResult.insertId,
                 product_id,
                 quantity_sold,
                 amount_received,
                 sale_tracking_id
             });
         }

         // Update the total amount in final_sale table
         await pool.query(
             `UPDATE final_sale
              SET TotalAmount = ?
              WHERE sale_tracking_Id = ?`,
             [totalAmountReceivedForSale, sale_tracking_id]
         );

         // Update isSettled in final_sale based on TotalAmount and AmountPaid
         const [finalSaleRecord] = await pool.query(
             `SELECT AmountPaid, TotalAmount FROM final_sale WHERE sale_tracking_Id = ?`,
             [sale_tracking_id]
         );

         if (finalSaleRecord.length > 0) {
             const { AmountPaid, TotalAmount } = finalSaleRecord[0];
             const isFullySettled = parseFloat(AmountPaid) >= parseFloat(TotalAmount) ? 1 : 0;
             await pool.query(
                 `UPDATE final_sale
                  SET isSettled = ?
                  WHERE sale_tracking_Id = ?`,
                 [isFullySettled, sale_tracking_id]
             );
         }

         res.json({ message: 'Sales added successfully', sales: salesResults });

     } catch (error) {
         console.error("Error in addSales:", error);
         res.status(500).json({ error: 'Database error' });
     }
 };

 // Function to generate a unique 10-character alphanumeric ID
 function generateUniqueSaleTrackingId() {
     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
     let saleId = '';
     for (let i = 0; i < 10; i++) {
         saleId += characters.charAt(Math.floor(Math.random() * characters.length));
     }
     return saleId;
 }

//add sales
exports.addSales = async (req, res) => {
    try {
        const {
            sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count } = req.body;

        if (!product_id || !price_id) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const [result] = await pool.query(
            `INSERT INTO sales (  sale_type,  marketing_staff_id,  product_id,  price_id,  quantity_sold,  amount_received,  is_credit,  sale_date,  damaged_count,  is_settled,  loss_count ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sale_type, marketing_staff_id, product_id, price_id, quantity_sold, amount_received, is_credit, sale_date, damaged_count, is_settled, loss_count]
        );

        // Update stock
        await pool.query(`UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND price_id = ?`, [quantity_sold, product_id, price_id]);



        res.json({ message: 'Sale and stock added successfully', sale_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

//search
exports.searchSales = async (req, res) => {
    try {
        const { sale_id } = req.body;
        if (!sale_id) return res.status(400).json({ error: "sales id required" });
        const [result] = await pool.query('SELECT `sale_id`, `sale_type`, `marketing_staff_id`, `product_id`, `price_id`, `quantity_sold`, `amount_received`, `is_credit`, `sale_date`, `damaged_count`, `is_settled`, `loss_count` FROM`sales` WHERE `sale_id` = ? AND `isActive` = 1', [sale_id]);
        res.json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }

}

//delete
exports.deleteSales = async (req, res) => {
    try {
        const { sale_id } = req.body;
        if (!sale_id) return res.status(400).json({ error: "sales id is required" });

        const [result] = await pool.query('UPDATE sales SET isActive = 0 WHERE sale_id= ?', [sale_id]);
        if (result.affectedRows === 0) return res.status(400).json({ error: 'sales id not found' });
        res.json({ message: 'sales id deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}