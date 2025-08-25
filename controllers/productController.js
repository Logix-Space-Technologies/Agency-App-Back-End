const pool = require('../config/db');


// Update product details and price
exports.updateProduct = async (req, res) => {
    try {
        const {
            product_id,
            product_name,
            // category_id,
            // brand_id,
            mrp,
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
             SET product_name = ?, mrp = ?, description = ?, expiry_date = ?, product_image = ?
             WHERE product_id = ? AND isActive = 1`,
            [product_name, mrp, description, expiry_date, product_image, product_id]
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
        const [products] = await pool.query('SELECT p.product_id, product_name, c.category_name, p.mrp,b.brand_name, pp.marketing_selling_price,pp.direct_selling_price, description, expiry_date, product_image, created_at FROM products p join categories c on c.category_id=p.category_id join brands b on b.brand_id=p.brand_id  JOIN product_prices pp ON pp.product_id=p.product_id  WHERE p.isActive = 1 and pp.isActive=1');
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
            `INSERT INTO products (product_name, category_id, brand_id, mrp, description, expiry_date, product_image)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [product_name, category_id, brand_id, mrp, description, expiry_date, product_image]
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
            `SELECT p.product_id, p.product_name, c.category_name, b.brand_name, p.mrp, p.description, p.expiry_date, p.product_image, p.created_at
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

exports.damagedProductSearch = async (req, res) => {
  try {
    const { userId, productId, filterType, startDate, endDate } = req.body;

    let returnQuery = `
  SELECT 
    'return' AS source,
    r.invoice_no,
    r.date,
    p.product_id,
    p.product_name,
    NULL as damagedQty,
    r.damaged_refund_quantity,
    r.damaged_replacement_quantity
  FROM direct_sale_return r
  JOIN products p ON r.product_id = p.product_id
  JOIN sales s ON s.sale_tracking_Id = r.invoice_no
  WHERE (r.damaged_refund_quantity > 0 OR r.damaged_replacement_quantity > 0)
`;

let salesQuery = `
  SELECT 
    'sale' AS source,
    s.sale_tracking_Id as invoice_no,
    s.sale_date AS date,
    p.product_id,
    p.product_name,
    s.damaged_count AS damagedQty,
    NULL AS damaged_refund_quantity,
    NULL AS damaged_replacement_quantity
  FROM sales s
  JOIN products p ON s.product_id = p.product_id
  WHERE s.isActive = 1 AND s.sale_type = "marketing" AND s.damaged_count > 0
`;

let queryParams = [];

// user filter
if (userId) {
  //returnQuery += " AND s.marketing_staff_id = ? ";
  returnQuery += " AND s.sale_type = 'marketing'";
  salesQuery += " AND s.marketing_staff_id = ? ";
  queryParams.push(userId); // push twice (once for each SELECT)
}

// product filters
if (productId) {
  returnQuery += " AND r.product_id = ? ";
  salesQuery += " AND s.product_id = ? ";
  queryParams.push(productId); // push twice (once for each SELECT)
}

// filter type
if (filterType === "daily") {
  returnQuery += " AND DATE(r.date) = ? ";
  salesQuery += " AND DATE(s.sale_date) = ? ";
  queryParams.push(startDate);
} else if (filterType === "dateRange") {
  returnQuery += " AND DATE(r.date) BETWEEN ? AND ? ";
  salesQuery += " AND DATE(s.sale_date) BETWEEN ? AND ? ";
  queryParams.push(startDate,endDate);
}

// Finally, run both queries
const [returnRows] = await pool.query(returnQuery, queryParams);
const [saleRows] = await pool.query(salesQuery, queryParams);

    const result = [...returnRows, ...saleRows].sort((a, b) => new Date(b.date) - new Date(a.date));

    // ✅ Calculate separate totals
    let totalDamagedQty = 0;
    let totalDamagedRefund = 0;
    let totalDamagedReplace = 0;

    result.forEach((row) => {
      totalDamagedQty += row.damagedQty || 0;
      totalDamagedRefund += row.damaged_refund_quantity || 0;
      totalDamagedReplace += row.damaged_replacement_quantity || 0;
    });

    //console.log(result);
    //res.json(result);
  res.json({
    summary: {
      totalDamagedQty,
      totalDamagedRefund,
      totalDamagedReplace,
      recordCount: result.length,
    },
    data: result,
  });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};