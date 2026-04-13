const pool = require('../config/db');


// Update product details and price
exports.updateProduct = async (req, res) => {
    try {
        const {
            product_id,
            product_name,
            category_id,
            brand_id,
            mrp,
            hsn_code,
            description,
            expiry_date,
            product_image
        } = req.body;

        if (!product_id) {
            return res.status(400).json({ error: "product_id is required" });
        }

        // Update product table only
        await pool.query(
            `UPDATE products 
             SET product_name = ?,category_id= ?,brand_id= ?, hsn_code=?, mrp = ?, description = ?, expiry_date = ?, product_image = ?
             WHERE product_id = ? AND isActive = 1`,
            [product_name,category_id,brand_id, hsn_code, mrp, description, expiry_date, product_image, product_id]
        );

        res.json({ message: 'Product details updated successfully' });

    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: "Database error during update" });
    }
};



//get all products
exports.getProduct = async (req, res) => {
    try {
        const [products] = await pool.query('SELECT p.product_id, product_name, c.category_name,c.category_id, p.mrp, p.hsn_code, b.brand_name,b.brand_id, pp.marketing_selling_price,pp.direct_selling_price, description, expiry_date, product_image, created_at FROM products p join categories c on c.category_id=p.category_id join brands b on b.brand_id=p.brand_id  JOIN product_prices pp ON pp.product_id=p.product_id  WHERE p.isActive = 1 and pp.isActive=1');
        res.json(products);


    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
}

exports.addProduct = async (req, res) => {
    try {
        const {
            product_name,
            category_id,
            brand_id,
            hsn_code,
            mrp,
            description,
            expiry_date,
            product_image
        } = req.body;

        if (!product_name) {
            return res.status(400).json({ error: "product_name required" });
        }

        // Insert into products
        const [productResult] = await pool.query(
            `INSERT INTO products (product_name, category_id, brand_id, hsn_code, mrp, description, expiry_date, product_image)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [product_name, category_id, brand_id, hsn_code, mrp, description, expiry_date, product_image]
        );

        const product_id = productResult.insertId;

        // Insert into product_prices
        const [priceResult] = await pool.query(
            `INSERT INTO product_prices (product_id, purchase_price, marketing_selling_price, direct_selling_price, effective_date)
             VALUES (?, 0, ?, ?, NOW())`,
            [product_id, mrp, mrp]
        );

        const price_id = priceResult.insertId;

        // Insert initial stock (quantity = 0, isActive = 1)
        await pool.query(
            `INSERT INTO stock (product_id, price_id, quantity, added_date, isActive)
             VALUES (?, ?, 0, NOW(), 1)`,
            [product_id, price_id]
        );

        res.json({ message: 'Product added successfully', product_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};


// delete
exports.delProducts = async (req, res) => {
    try {
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ error: "product id required" });

        const [result] = await pool.query('UPDATE `products` SET `isActive` = 0 WHERE `product_id`= ?', [product_id]);
        if (result.affectedRows === 0) return res.status(400).json({ error: "product not found" });
        res.json({ message: 'product deleted successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });

    }
}

// Search

exports.searchProduct = async (req, res) => {
    try {
        const { product_name } = req.body;

        if (!product_name) {
            return res.status(400).json({ error: "Product name is required" });
        }

        const searchTerm = `%${product_name}%`;

        const [result] = await pool.query(
            `SELECT p.product_id, p.product_name, c.category_name,c.category_id,b.brand_id, b.brand_name, p.mrp, p.hsn_code, p.description, p.expiry_date, p.product_image, p.created_at
            FROM products p
            JOIN categories c ON c.category_id = p.category_id
            JOIN brands b ON b.brand_id = p.brand_id
            WHERE (p.product_name LIKE ? OR b.brand_name LIKE ? OR c.category_name LIKE ?) AND p.isActive = 1`,
            [searchTerm, searchTerm, searchTerm]
        );

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

// exports.damagedProductSearch = async (req, res) => {
//   try {
//     const { userId, productId, filterType, startDate, endDate } = req.body;

//     let returnQuery = `
//   SELECT 
//     'return' AS source,
//     r.invoice_no,
//     r.date,
//     p.product_id,
//     p.product_name,
//     NULL as damagedQty,
//     r.damaged_refund_quantity,
//     r.damaged_replacement_quantity
//   FROM direct_sale_return r
//   JOIN products p ON r.product_id = p.product_id
//   JOIN sales s ON (s.sale_tracking_Id = r.invoice_no AND s.product_id = r.product_id)
//   WHERE 1 = 1
// `;

//     let salesQuery = `
//   SELECT 
//     'sale' AS source,
//     s.sale_tracking_Id as invoice_no,
//     s.sale_date AS date,
//     p.product_id,
//     p.product_name,
//     s.damaged_count AS damagedQty,
//     NULL AS damaged_refund_quantity,
//     NULL AS damaged_replacement_quantity
//   FROM sales s
//   JOIN products p ON s.product_id = p.product_id
//   WHERE s.isActive = 1 AND s.sale_type = "marketing"
// `;

// let miscQuery = `
//   SELECT
//     'misc' AS source,
//     NULL AS invoice_no,
//     md.addedDate AS date,
//     p.product_id,
//     p.product_name,
//     md.quantity AS damagedQty,
//     NULL AS damaged_refund_quantity,
//     NULL AS damaged_replacement_quantity,
//     md.addedBy AS user_id
//   FROM miscellaneous_damage md
//   JOIN products p ON md.product_id = p.product_id
//   WHERE md.isActive = 1
// `;

//     let queryParams = [];

//     // user filter
//     if (userId) {
//       //returnQuery += " AND s.marketing_staff_id = ? ";
//       returnQuery += " AND s.sale_type = 'marketing'";
//       salesQuery += " AND s.marketing_staff_id = ? ";
//       miscQuery += " AND md.addedBy = ? ";
//       queryParams.push(userId); // push twice (once for each SELECT)
//     }

//     // product filters
//     if (productId) {
//       returnQuery += " AND r.product_id = ? ";
//       salesQuery += " AND s.product_id = ? ";
//       miscQuery += " AND md.product_id = ? ";
//       queryParams.push(productId); // push twice (once for each SELECT)
//     }

//     // filter type
//     if (filterType === "daily") {
//       returnQuery += " AND DATE(r.date) = ? ";
//       salesQuery += " AND DATE(s.sale_date) = ? ";
//       miscQuery += " AND DATE(md.addedDate) = ? ";
//       queryParams.push(startDate);
//     } else if (filterType === "listdDateRange") {
//       returnQuery += " AND DATE(r.date) BETWEEN ? AND ? ";
//       salesQuery += " AND DATE(s.sale_date) BETWEEN ? AND ? ";
//       miscQuery += " AND DATE(md.addedDate) BETWEEN ? AND ? ";
//       queryParams.push(startDate, endDate);
//     }


//     const [returnRows] = await pool.query(returnQuery, queryParams);
//     const [saleRows] = await pool.query(salesQuery, queryParams);
//     const [miscRows]   = await pool.query(miscQuery, queryParams);
//     // console.log(returnRows)
//     // console.log(saleRows)
//     //console.log(miscRows)
//     const result = [...returnRows, ...saleRows,  ...miscRows].sort(
//       (a, b) => new Date(b.date) - new Date(a.date)
//     );

//     const [allProducts] = await pool.query(`
//       SELECT 
//         p.product_id,
//         p.product_name
//       FROM products p
//     `);

//     let productSummaryMap = {};

//     allProducts.forEach(p => {
//         productSummaryMap[p.product_id] = {
//           productId: p.product_id,
//           productName: p.product_name,
//           damagedQty: 0,
//           damagedRefund: 0,
//           damagedReplace: 0,
//           miscDamagedQty: 0,
//         };
//       });
//     let grandTotal = { damagedQty: 0, damagedRefund: 0, damagedReplace: 0, miscDamagedQty: 0 };

//     result.forEach((row) => {
//       const pid = row.product_id;
//       if (!productSummaryMap[pid]) {
//         productSummaryMap[pid] = {
//           productId: row.product_id,
//           productName: row.product_name,
//           damagedQty: 0,
//           damagedRefund: 0,
//           damagedReplace: 0,
//           miscDamagedQty: 0,
//         };
//       }
//       if (row.source === "misc") {
//         productSummaryMap[pid].miscDamagedQty += row.damagedQty || 0;
//         grandTotal.miscDamagedQty += row.damagedQty || 0;
//       } else {
//       productSummaryMap[pid].damagedQty += row.damagedQty || 0;
//       productSummaryMap[pid].damagedRefund += row.damaged_refund_quantity || 0;
//       productSummaryMap[pid].damagedReplace += row.damaged_replacement_quantity || 0;

//       // also add to grand totals
//       grandTotal.damagedQty += row.damagedQty || 0;
//       grandTotal.damagedRefund += row.damaged_refund_quantity || 0;
//       grandTotal.damagedReplace += row.damaged_replacement_quantity || 0;
//       }
//     });

//     const productSummary = Object.values(productSummaryMap);

//     //console.log(result);
//     //res.json(result);
//     res.json({
//       summary: productSummary,
//       totals: grandTotal,
//       data: result,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Database error" });
//   }
// };

exports.damagedProductSearch = async (req, res) => {
  try {
    const { userId, productId, filterType, startDate, endDate } = req.body;


    let salesQuery = `
      SELECT 
        'sale' AS source,
        s.sale_tracking_Id,
        fs.invoiceNumber AS invoice_no,
        s.sale_date AS date,
        p.product_id,
        p.product_name,
        s.damaged_count AS damagedQty,
        NULL AS damaged_refund_quantity,
        NULL AS damaged_replacement_quantity
      FROM sales s
      JOIN final_sale fs ON fs.sale_tracking_Id = s.sale_tracking_Id
      JOIN products p ON s.product_id = p.product_id
      WHERE s.isActive = 1 AND s.sale_type = "marketing"
    `;

    let miscQuery = `
      SELECT
        'misc' AS source,
        NULL AS invoice_no,
        md.addedDate AS date,
        p.product_id,
        p.product_name,
        md.quantity AS damagedQty,
        NULL AS damaged_refund_quantity,
        NULL AS damaged_replacement_quantity,
        md.addedBy AS user_id
      FROM miscellaneous_damage md
      JOIN products p ON md.product_id = p.product_id
      WHERE md.isActive = 1
    `;

    let queryParams = [];

    // user filter
    if (userId) {
      salesQuery += " AND s.marketing_staff_id = ? ";
      miscQuery += " AND md.addedBy = ? ";
      queryParams.push(userId);
    }

    // product filter
    if (productId) {
      salesQuery += " AND s.product_id = ? ";
      miscQuery += " AND md.product_id = ? ";
      queryParams.push(productId);
    }

    // date filter
    if (filterType === "daily") {
      salesQuery += " AND DATE(s.sale_date) = ? ";
      miscQuery += " AND DATE(md.addedDate) = ? ";
      queryParams.push(startDate);
    } else if (filterType === "listdDateRange") {
      salesQuery += " AND DATE(s.sale_date) BETWEEN ? AND ? ";
      miscQuery += " AND DATE(md.addedDate) BETWEEN ? AND ? ";
      queryParams.push(startDate, endDate);
    }

    const [saleRows]   = await pool.query(salesQuery, queryParams);
    const [miscRows]   = await pool.query(miscQuery, queryParams);

  const result = [...saleRows, ...miscRows]
  .filter(row => {
    const damagedQty = Number(row.damagedQty || 0);
    const refundQty = row.damaged_refund_quantity;
    const replaceQty = row.damaged_replacement_quantity;

    // REMOVE rows where everything is zero/null
    const isAllZeroOrNull =
      damagedQty === 0 &&
      (refundQty === null || refundQty === undefined) &&
      (replaceQty === null || replaceQty === undefined);

    return !isAllZeroOrNull; // keep only meaningful rows
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date));


    // ⭐ CHANGE: get all products
    const [allProducts] = await pool.query(`
      SELECT product_id, product_name FROM products
    `);

    // ⭐ CHANGE: initialize all products with zero values
    let productSummaryMap = {};
    allProducts.forEach(p => {
      productSummaryMap[p.product_id] = {
        productId: p.product_id,
        productName: p.product_name,
        damagedQty: 0,
        damagedRefund: 0,
        damagedReplace: 0,
        miscDamagedQty: 0,
      };
    });

    let grandTotal = {
      damagedQty: 0,
      damagedRefund: 0,
      damagedReplace: 0,
      miscDamagedQty: 0,
    };

    // ⭐ CHANGE: Number() to avoid string addition
    result.forEach(row => {
      const pid = row.product_id;

      if (row.source === "misc") {
        const qty = Number(row.damagedQty || 0);
        productSummaryMap[pid].miscDamagedQty += qty;
        grandTotal.miscDamagedQty += qty;
      } else {
        const damagedQty = Number(row.damagedQty || 0);
        const refundQty  = Number(row.damaged_refund_quantity || 0);
        const replaceQty = Number(row.damaged_replacement_quantity || 0);

        productSummaryMap[pid].damagedQty += damagedQty;
        productSummaryMap[pid].damagedRefund += refundQty;
        productSummaryMap[pid].damagedReplace += replaceQty;

        grandTotal.damagedQty += damagedQty;
        grandTotal.damagedRefund += refundQty;
        grandTotal.damagedReplace += replaceQty;
      }
    });

    // ⭐ CHANGE: sort by total damaged qty DESC
    const productSummary = Object.values(productSummaryMap).sort((a, b) => {
      const totalA =
        a.damagedQty + a.damagedRefund + a.damagedReplace + a.miscDamagedQty;
      const totalB =
        b.damagedQty + b.damagedRefund + b.damagedReplace + b.miscDamagedQty;
      return totalB - totalA;
    });

    res.json({
      summary: productSummary,
      totals: grandTotal,
      data: result, // unchanged (used for details view)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};


exports.addMiscDamagedProduct = async (req, res) => {
  try {
    const { productId, productName,damagedQty,damagedRefund,damagedReplace,loggedInUserId } = req.body;
    console.log(req.body);

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const sql = "INSERT INTO `miscellaneous_damage` (`product_id`, `quantity`, `addedDate`, `addedBy`, `isActive`) VALUES (?,?,NOW(),?,1)";
    const [result] = await pool.query(sql, [productId, damagedQty,loggedInUserId ]);

    const updatesql = "UPDATE stock SET Damage_Qty = Damage_Qty + ?, modified_date = NOW() WHERE product_id = ?";
    await pool.query(updatesql, [damagedQty,productId]);

    res.json({
      message: "Misc damaged quantity added successfully",
      brand_id: result.insertId,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Database error" });
  }
};

exports.getMiscDamagedProduct = async (req, res) => {
  try {
    const { productId} = req.body;
    console.log(req.body);

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const sql = "SELECT  * FROM `miscellaneous_damage` WHERE product_id = ? ORDER BY `miscellaneous_damage`.`id` DESC";
    const [result] = await pool.query(sql, [productId]);
    console.log(result)


    res.json({
      message: "Misc damaged quantity fetched successfully",
      details: result,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Database error" });
  }
};