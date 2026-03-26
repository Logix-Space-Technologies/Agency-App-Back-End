const pool = require('../config/db');
const { getISTTimestamp } = require('../utils/dateUtils');

exports.updateProductPrice = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const {
            price_id,
            product_id,
            product_mrp,
            purchase_price,
            commision_rate,
            marketing_selling_price,
            direct_selling_price,
            whole_sale_price,
            effective_date,
            cgst_percentage = 0.00,
            sgst_percentage = 0.00,
            igst_percentage = 0.00,
            cess_percentage = 0.00
        } = req.body;
        const updatedAt = getISTTimestamp();
        if (!price_id) return res.status(400).json({ error: "price_id is required" });

        const formattedDate = effective_date?.split("T")[0];
if(product_mrp){
const [rows] = await connection.query(
  "SELECT product_name, mrp FROM `products` WHERE `product_id`= ? AND `isActive`=1",
  [product_id]
);

if (rows.length > 0) {
  const mrp = rows[0].mrp;
  if (mrp != product_mrp) {
    await connection.query(
      "UPDATE `products` SET `mrp`= ?, `modified`= ? WHERE `product_id` = ?",
      [product_mrp, updatedAt, product_id]
    );
  }
} else {
  console.log("No product found with the given ID");
}
    }

        const [existingRows] = await connection.query(
            `SELECT * FROM product_prices WHERE price_id = ? AND isActive = 1`,
            [price_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ error: "Active product price not found" });
        }

        const existing = existingRows[0];

        const isChanged =
            existing.purchase_price != purchase_price ||
            existing.commision_rate != commision_rate ||
            existing.marketing_selling_price != marketing_selling_price ||
            existing.direct_selling_price != direct_selling_price ||
            existing.whole_sale_price != whole_sale_price ||
            existing.cgst_percentage != cgst_percentage ||
            existing.sgst_percentage != sgst_percentage ||
            existing.igst_percentage != igst_percentage ||
            existing.cess_percentage != cess_percentage ||
            existing.effective_date.toISOString().split("T")[0] !== formattedDate;

        if (!isChanged) {
            return res.json({ message: "No change detected. No update needed." });
        }

        await connection.query(
            `UPDATE product_prices SET isActive = 0 WHERE price_id = ?`,
            [price_id]
        );

        const [insertResult] = await connection.query(
            `INSERT INTO product_prices
                (product_id, purchase_price, commision_rate, marketing_selling_price, direct_selling_price, whole_sale_price, effective_date, modified, isActive, cgst_percentage, sgst_percentage, igst_percentage, cess_percentage)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
            [
                product_id,
                purchase_price,
                commision_rate,
                marketing_selling_price,
                direct_selling_price,
                whole_sale_price,
                formattedDate,
                updatedAt,
                cgst_percentage,
                sgst_percentage,
                igst_percentage,
                cess_percentage
            ]
        );
        const newPriceId = insertResult.insertId;

        // Update stock table with new price_id for this product
        await connection.query(
            `UPDATE stock 
            SET price_id = ? 
            WHERE product_id = ?`,
            [newPriceId, product_id]
        );
        res.json({ message: "Product price updated successfully", new_price_id: newPriceId });

    } catch (error) {
    await connection.rollback();

    console.error(error);
    res.status(500).json({
      error: error.message || "Database error",
    });

    } finally {
        connection.release();
    }
};


// update
// exports.updateProductPrice = async (req, res) => {
//     try {
//         const {
//             price_id,
//             product_id,
//             purchase_price,
//             commision_rate,
//             marketing_selling_price,
//             direct_selling_price,
//             whole_sale_price,
//             effective_date
//         } = req.body;

//         if (!price_id) return res.status(400).json({ error: "price_id is required" });

//         const formattedDate = effective_date?.split("T")[0];

//         // Step 1: Fetch the existing record
//         const [existingRows] = await pool.query(
//             `SELECT * FROM product_prices WHERE price_id = ? AND isActive = 1`,
//             [price_id]
//         );

//         if (existingRows.length === 0) {
//             return res.status(404).json({ error: "Active product price not found" });
//         }

//         const existing = existingRows[0];

//         // Step 2: Check if any relevant field has changed
//         const isChanged =
//             existing.purchase_price != purchase_price ||
//             existing.commision_rate != commision_rate ||
//             existing.marketing_selling_price != marketing_selling_price ||
//             existing.direct_selling_price != direct_selling_price ||
//             existing.whole_sale_price != whole_sale_price ||
//             existing.effective_date.toISOString().split("T")[0] !== formattedDate;

//         if (!isChanged) {
//             return res.json({ message: "No change detected. No update needed." });
//         }

//         // Step 3: Set existing record as inactive
//         await pool.query(
//             `UPDATE product_prices SET isActive = 0 WHERE price_id = ?`,
//             [price_id]
//         );

//         // Step 4: Insert new record with updated data and isActive = 1
//         const [insertResult] = await pool.query(
//             `INSERT INTO product_prices
//                 (product_id, purchase_price, commision_rate, marketing_selling_price, direct_selling_price, whole_sale_price, effective_date, isActive)
//              VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
//             [
//                 product_id,
//                 purchase_price,
//                 commision_rate,
//                 marketing_selling_price,
//                 direct_selling_price,
//                 whole_sale_price,
//                 formattedDate
//             ]
//         );

//         res.json({ message: "Product price updated successfully", new_price_id: insertResult.insertId });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Database error" });
//     }
// };



// get all product price

exports.getProductPrice = async(req,res)=>{
    try{
            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 15;
            const offset = (page - 1) * limit;
            
            // Total count
            const [[{ total }]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM products p
            JOIN product_prices pp ON p.product_id = pp.product_id
            WHERE pp.isActive = 1
            `);
            
            // Paginated data
        const [product_prices]=await pool.query(`
            SELECT
                pp.price_id,
                b.brand_name,
                p.product_id,
                p.product_name,
                p.hsn_code,
                c.category_name,
                p.mrp,
                p.description,
                p.expiry_date,
                p.product_image,
                p.created_at,
                pp.purchase_price,
                pp.commision_rate,
                pp.marketing_selling_price,
                pp.direct_selling_price,
                pp.whole_sale_price,
                pp.effective_date,
                pp.modified,
                 pp.cgst_percentage, 
                  pp.sgst_percentage,  
                  pp.igst_percentage, 
                   pp.cess_percentage

            FROM products p
            JOIN product_prices pp ON p.product_id = pp.product_id
            JOIN brands b ON b.brand_id = p.brand_id
            JOIN categories c ON c.category_id = p.category_id
            WHERE pp.isActive = 1
            ORDER BY p.product_name
            LIMIT ? OFFSET ?
        `,
        [limit, offset]);
        //res.json(product_prices);
        
        res.json({
        data: product_prices,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
        });
    }catch(error){
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}

// get all product prices for PRINT (no pagination)
exports.getProductPriceForPrint = async (req, res) => {
  try {
    const [product_prices] = await pool.query(`
      SELECT
        pp.price_id,
        b.brand_name,
        p.product_id,
        p.product_name,
        p.hsn_code,
        c.category_name,
        p.mrp,
        pp.purchase_price,
        pp.commision_rate,
        pp.marketing_selling_price,
        pp.direct_selling_price,
        pp.whole_sale_price,
        pp.effective_date,
        pp.modified
      FROM products p
      JOIN product_prices pp ON p.product_id = pp.product_id
      JOIN brands b ON b.brand_id = p.brand_id
      JOIN categories c ON c.category_id = p.category_id
      WHERE pp.isActive = 1
      ORDER BY p.product_name
    `);

    res.json(product_prices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};


// add

exports.addProductPrice = async (req, res) => {
    try {
        const {
            product_id,
            purchase_price,
            commision_rate,
            marketing_selling_price,
            direct_selling_price,
            whole_sale_price,
            effective_date
        } = req.body;

        if (!product_id) return res.status(400).json({ error: "product_id is required" });

        const [result] = await pool.query(
            `INSERT INTO product_prices (product_id, purchase_price, commision_rate, marketing_selling_price, direct_selling_price, whole_sale_price, effective_date)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [product_id, purchase_price, commision_rate, marketing_selling_price, direct_selling_price, whole_sale_price, effective_date]
        );

        res.json({ message: 'Product price added successfully', price_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

//search

exports.searchProductPrice = async (req, res) => {
    try {
        const { brandId, productId } = req.body;
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 15;
        const offset = (page - 1) * limit;
        console.log(page+" test "+limit+" "+offset);
        let whereClause = ` WHERE pp.isActive = 1 `;
        const params = [];

        if (productId) {
            whereClause += ` AND p.product_id = ?`;
            params.push(productId);
        }

        if (brandId) {
            whereClause += ` AND b.brand_id = ?`;
            params.push(brandId);
        }

        /* ---------- TOTAL COUNT ---------- */
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM products p
            JOIN product_prices pp ON p.product_id = pp.product_id
            JOIN brands b ON b.brand_id = p.brand_id
            JOIN categories c ON c.category_id = p.category_id
            ${whereClause}
        `;

        const [[{ total }]] = await pool.query(countQuery, params);

        /* ---------- PAGINATED DATA ---------- */
        const dataQuery = `
            SELECT
                pp.price_id,
                b.brand_name,
                p.product_id,
                p.product_name,
                p.hsn_code,
                c.category_name,
                p.mrp,
                p.description,
                p.expiry_date,
                p.product_image,
                p.created_at,
                pp.purchase_price,
                pp.commision_rate,
                pp.marketing_selling_price,
                pp.direct_selling_price,
                pp.whole_sale_price,
                pp.effective_date,
                pp.cgst_percentage, 
                pp.sgst_percentage,  
                pp.igst_percentage, 
                pp.cess_percentage
            FROM products p
            JOIN product_prices pp ON p.product_id = pp.product_id
            JOIN brands b ON b.brand_id = p.brand_id
            JOIN categories c ON c.category_id = p.category_id
            ${whereClause}
            ORDER BY p.product_name
            LIMIT ? OFFSET ?
        `;
        const [searchResult] = await pool.query(
            dataQuery,
            [...params, limit, offset]
        );
        res.json({
            data: searchResult,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
 
        //if (!product_name) return res.status(400).json({ error: "product name is required" });
        // let query = `SELECT
        //         pp.price_id,
        //         b.brand_name,
        //         p.product_id,
        //         product_name,
        //         c.category_name,
        //         mrp,
        //         description,
        //         expiry_date,
        //         product_image,
        //         created_at,
        //         pp.purchase_price,
        //         pp.commision_rate,
        //         pp.marketing_selling_price,
        //         pp.direct_selling_price,
        //         pp.whole_sale_price,
        //         pp.effective_date,
        //             pp.cgst_percentage, 
        //           pp.sgst_percentage,  
        //           pp.igst_percentage, 
        //            pp.cess_percentage
        //      FROM products p
        //      JOIN product_prices pp ON p.product_id = pp.product_id
        //      JOIN brands b ON b.brand_id = p.brand_id
        //      JOIN categories c ON c.category_id = p.category_id
        //      WHERE pp.isActive=1 `
             
        // const params = [];

        // if (productId) {
        //     query += " AND p.product_id = ?";
        //     params.push(productId);
        // }

        // if (brandId) {
        //     query += " AND b.brand_id = ?";
        //     params.push(brandId);
        // }

        // const [result] = await pool.query(query, params);
        // res.json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};


//delete
exports.deleteProductPrice = async(req,res)=>{
    try{
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ error: "product id is required" });

        const [result] = await pool.query('UPDATE product_prices SET isActive = 0 WHERE product_id = ? ',[product_id]);
        if (result.affectedRows === 0) return res.status(400).json({ error: 'product price not found' });
        res.json({ message: 'product price deleted successfully' });


    }catch(error){
        console.error(error);
        res.status(500).json({ error: 'Database error' });

    }
}