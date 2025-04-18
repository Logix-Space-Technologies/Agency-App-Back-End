const pool = require('../config/db'); // Assuming your db.js exports the promise pool


// Get All Active Purchases with Supplier and Product Name
exports.getAllPurchases = async (req, res) => {
    try {
        const [purchases] = await pool.execute(`
            SELECT
                pr.product_name,
                p.purchase_date,
                p.purchase_price,
                p.total_amount,
                p.quantity,
                p.Invoice_Number,
                s.supplier_name,
                p.AddedDate,
                p.is_damaged,
                p.damage_description,
                p.replacement_provided,
                p.replacement_date,
                p.is_free_replacement,
                p.id AS purchase_id
            FROM
                purchase p
            JOIN
                suppliers s ON p.supplier_id = s.supplier_id
            JOIN
                products pr ON pr.product_id = p.product_id
            WHERE
                p.isActive = 1
        `);
        res.json(purchases);
    } catch (error) {
        console.error('Error fetching active purchases with supplier and product:', error);
        res.status(500).json({ error: 'Database error while fetching active purchases.' });
    }
};


// Get All Suppliers (for the dropdown)
exports.getSuppliers = async (req, res) => {
    try {
        const [suppliers] = await pool.execute('SELECT supplier_id, supplier_name FROM suppliers WHERE isActive = 1');
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Database error while fetching suppliers' });
    }
};

// Get All Products (for the dropdown)
exports.getProducts = async (req, res) => {
    try {
        const [products] = await pool.execute('SELECT product_id, product_name FROM products WHERE isActive = 1');
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Database error while fetching products' });
    }
};

// Create a New Purchase with Multiple Items and Update Stock & History
exports.createPurchase = async (req, res) => {
    const { supplierId, invoiceNumber, purchaseDetails, addedBy } = req.body;

    console.log("Received request body in createPurchase:", req.body); // For debugging

    if (!supplierId || !invoiceNumber || !purchaseDetails || purchaseDetails.length === 0) {
        return res.status(400).json({ error: 'Missing required purchase data.' });
    }

    let connection;

    try {
        // Obtain a connection from the pool
        connection = await pool.getConnection();

        // Start a transaction on the connection
        await connection.beginTransaction();

        // Insert details for each purchased item and update stock & history
        for (const item of purchaseDetails) {
            const { productId, quantity, purchasePrice, totalAmount } = item;
            if (!productId || !quantity || !purchasePrice) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'Missing details for a purchase item.' });
            }

            // Insert into the purchase table
            const [purchaseResult] = await connection.execute(
                'INSERT INTO purchase (product_id, purchase_date, purchase_price, total_amount, quantity, Invoice_Number, supplier_id) VALUES (?, NOW(), ?, ?, ?, ?, ?)',
                [productId, purchasePrice, totalAmount, quantity, invoiceNumber, supplierId]
            );
            const purchaseItemId = purchaseResult.insertId;

            // Get the current stock quantity before update
            const [currentStock] = await connection.execute(
                'SELECT quantity FROM stock WHERE product_id = ?',
                [productId]
            );
            const oldQuantity = currentStock.length > 0 ? parseInt(currentStock[0].quantity) : 0;

            // Update stock
            const [stockUpdateResult] = await connection.execute(
                'UPDATE stock SET quantity = quantity + ?, added_date = NOW() WHERE product_id = ?',
                [quantity, productId]
            );

            // Insert into stock history
            await connection.execute(
                'INSERT INTO stock_History (stock_Id, Qty, stock_type, AddedDate, AddedBy, CreditOrDebit, ReferenceInvoiceOrSale) VALUES (?, ?, ?, NOW(), ?, ?, ?)',
                [
                    productId,
                    quantity,
                    'purchase',
                    0,
                    'Credit',
                    invoiceNumber
                ]
            );
        }

        // Commit the transaction
        await connection.commit();
        connection.release();

        res.status(201).json({ message: 'Purchase created, stock updated, and stock history recorded successfully!' });

    } catch (error) {
        // If any error occurred, rollback the transaction and release the connection
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error creating purchase, updating stock, and recording history:', error);
        res.status(500).json({ error: 'Database error during purchase and stock update process.' });
    }
};