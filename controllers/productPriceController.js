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

        console.log(req.body);

        if (!price_id) return res.status(400).json({ error: "price_id is required" });

        // ✅ Format the date to 'YYYY-MM-DD' (MySQL compatible for DATE columns)
        const formattedDate = effective_date?.split("T")[0];

        const [result] = await pool.query(
            `UPDATE product_prices 
             SET product_id = ?, 
                 purchase_price = ?, 
                 marketing_selling_price = ?, 
                 direct_selling_price = ?, 
                 effective_date = ?
             WHERE price_id = ?`,
            [
                product_id,
                purchase_price,
                marketing_selling_price,
                direct_selling_price,
                formattedDate,
                price_id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Product price not found or no changes made" });
        }

        res.json({ message: 'Product price updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};


// get all product price

exports.getProductPrice = async(req,res)=>{
    try{
        const [product_prices]=await pool.query('SELECT pp.price_id,b.brand_name, p.`product_id`, `product_name`, c.category_name,  `mrp`, `description`, `expiry_date`, `product_image`, `created_at`, pp.purchase_price,pp.marketing_selling_price,pp.direct_selling_price,pp.effective_date  FROM `products` p JOIN product_prices pp on p.product_id=pp.product_id JOIN brands b on b.brand_id=p.brand_id JOIN categories c on c.category_id=p.category_id ');
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
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ error: "product id is required" });

        const [result] = await pool.query('SELECT * FROM product_prices WHERE product_id = ?', [product_id]);
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

        const [result] = await pool.query('DELETE FROM product_prices WHERE product_id= ?',[product_id]);
        if (result.affectedRows === 0) return res.status(400).json({ error: 'product price not found' });
        res.json({ message: 'product price deleted successfully' });


    }catch(error){
        res.status(500).json({ error: 'Database error' });

    }
}