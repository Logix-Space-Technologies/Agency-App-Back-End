const pool = require('../config/db');


// update
exports.updateProductPrice = async (req, res) => {
    try {
        const {
            price_id,
            product_id,
            purchase_price,
            marketing_selling_price,
            direct_selling_price,
            effective_date
        } = req.body;

        if (!price_id) return res.status(400).json({ error: "price_id is required" });

        const formattedDate = effective_date?.split("T")[0];

        // Step 1: Fetch the existing record
        const [existingRows] = await pool.query(
            `SELECT * FROM product_prices WHERE price_id = ? AND isActive = 1`,
            [price_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ error: "Active product price not found" });
        }

        const existing = existingRows[0];

        // Step 2: Check if any relevant field has changed
        const isChanged =
            existing.purchase_price != purchase_price ||
            existing.marketing_selling_price != marketing_selling_price ||
            existing.direct_selling_price != direct_selling_price ||
            existing.effective_date.toISOString().split("T")[0] !== formattedDate;

        if (!isChanged) {
            return res.json({ message: "No change detected. No update needed." });
        }

        // Step 3: Set existing record as inactive
        await pool.query(
            `UPDATE product_prices SET isActive = 0 WHERE price_id = ?`,
            [price_id]
        );

        // Step 4: Insert new record with updated data and isActive = 1
        const [insertResult] = await pool.query(
            `INSERT INTO product_prices 
                (product_id, purchase_price, marketing_selling_price, direct_selling_price, effective_date, isActive)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [
                product_id,
                purchase_price,
                marketing_selling_price,
                direct_selling_price,
                formattedDate
            ]
        );

        res.json({ message: "Product price updated successfully", new_price_id: insertResult.insertId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error" });
    }
};



// get all product price

exports.getProductPrice = async(req,res)=>{
    try{
        const [product_prices]=await pool.query('SELECT pp.price_id,b.brand_name, p.`product_id`, `product_name`, c.category_name,  `mrp`, `description`, `expiry_date`, `product_image`, `created_at`, pp.purchase_price,pp.marketing_selling_price,pp.direct_selling_price,pp.effective_date  FROM `products` p JOIN product_prices pp on p.product_id=pp.product_id JOIN brands b on b.brand_id=p.brand_id JOIN categories c on c.category_id=p.category_id where pp.isActive=1 ');
        res.json(product_prices);
    }catch(error){
        res.status(500).json({ error: 'Database error' });

    }
}

// add

exports.addProductPrice = async (req, res) => {
    try {
        const {
            product_id,
            purchase_price,
            marketing_selling_price,
            direct_selling_price,
            effective_date
        } = req.body;

        if (!product_id) return res.status(400).json({ error: "product_id is required" });

        const [result] = await pool.query(
            `INSERT INTO product_prices (product_id, purchase_price, marketing_selling_price, direct_selling_price, effective_date)
             VALUES (?, ?, ?, ?, ?)`,
            [product_id, purchase_price, marketing_selling_price, direct_selling_price, effective_date]
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
        const { product_name } = req.body;
        console.log(product_name)
        if (!product_name) return res.status(400).json({ error: "product name is required" });

        const [result] = await pool.query(
            `SELECT pp.price_id, b.brand_name, p.product_id, product_name, c.category_name, mrp, description, expiry_date, product_image, created_at, pp.purchase_price, pp.marketing_selling_price, pp.direct_selling_price, pp.effective_date
             FROM products p
             JOIN product_prices pp ON p.product_id = pp.product_id
             JOIN brands b ON b.brand_id = p.brand_id
             JOIN categories c ON c.category_id = p.category_id
             WHERE product_name LIKE ? and pp.isActive=1 `,
            [`%${product_name}%`]
          );

          res.json(result);
    } catch (error) {
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
        res.status(500).json({ error: 'Database error' });

    }
}