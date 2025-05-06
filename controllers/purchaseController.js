const pool = require('../config/db'); // Assuming your db.js exports the promise pool



// Create a New Purchase with Support for Replacements
exports.createPurchaseNew = async (req, res) => {
    console.log("test")
    const { supplierId, invoiceNumber, purchaseDetails, addedBy, isReplacement } = req.body;

    if (!supplierId || !purchaseDetails || purchaseDetails.length === 0) {
        return res.status(400).json({ error: 'Missing required purchase data.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        for (const item of purchaseDetails) {
            const { productId, quantity, purchasePrice, totalAmount, isDamaged } = item;
            
    // Validate replacement quantity against Damage_Qty
    if (isReplacement) {
        const [stock] = await connection.execute(
            'SELECT Damage_Qty FROM stock WHERE product_id = ?',
            [productId]
        );
        
        if (stock.length === 0 || stock[0].Damage_Qty < quantity) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ 
                error: `Cannot replace ${quantity} items. Only ${stock[0]?.Damage_Qty || 0} damaged items available for product ID ${productId}.`
            });
        }
    }
            
            if (!productId || !quantity) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'Missing details for a purchase item.' });
            }

            // Insert into purchase table
            const [purchaseResult] = await connection.execute(
                `INSERT INTO purchase (
                    product_id, purchase_date, purchase_price, total_amount, quantity,
                    Invoice_Number, supplier_id, is_damaged, damage_description,
                    replacement_provided, replacement_date, is_free_replacement
                ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    productId,
                    isReplacement ? 0 : purchasePrice, // Zero price for replacements
                    isReplacement ? 0 : totalAmount,   // Zero total for replacements
                    quantity,
                    invoiceNumber,
                    supplierId,
                    isDamaged || false,
                    isDamaged ? 'Damaged item' : null,
                    isReplacement || false,
                    isReplacement ? new Date() : null,
                    isReplacement
                ]
            );

            // Update stock based on purchase type
            if (isReplacement) {
                // For replacements, reduce damaged quantity
                await connection.execute(
                    'UPDATE stock SET Damage_Qty = Damage_Qty - ? WHERE product_id = ?',
                    [quantity, productId]
                );
            } else if (isDamaged) {
                // For damaged items, move to Damage_Qty
                await connection.execute(
                    'UPDATE stock SET quantity = quantity - ?, Damage_Qty = Damage_Qty + ? WHERE product_id = ?',
                    [quantity, quantity, productId]
                );
            } 
            
            // else {
                // Normal purchase - increase regular quantity
                await connection.execute(
                    'UPDATE stock SET quantity = quantity + ? WHERE product_id = ?',
                    [quantity, productId]
                );
            // }

            // Record in stock history
            await connection.execute(
                `INSERT INTO stock_History (
                    stock_Id, Qty, stock_type, AddedDate, AddedBy,
                    CreditOrDebit, ReferenceInvoiceOrSale
                ) VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
                [
                    productId,
                    quantity,
                    isReplacement ? 'replacement' : (isDamaged ? 'damage' : 'purchase'),
                    0,
                    isReplacement || isDamaged ? 'Debit' : 'Credit',
                    invoiceNumber
                ]
            );
        }

        await connection.commit();
        connection.release();
        res.status(201).json({ message: 'Purchase processed successfully!' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error in purchase process:', error);
        res.status(500).json({ error: 'Database error during purchase process.' });
    }
};

// Get Damaged Items
exports.getDamagedItems = async (req, res) => {
    try {
        const [items] = await pool.execute(`
            SELECT 
                p.product_id, 
                p.product_name,
                p.product_image,
                s.Damage_Qty as damaged_quantity,
                MAX(pur.purchase_date) as last_purchase_date,
                MAX(pur.Invoice_Number) as last_invoice,
                sup.supplier_name,
                sup.supplier_id,
                s.quantity as current_stock
            FROM 
                products p
            JOIN 
                stock s ON p.product_id = s.product_id
            LEFT JOIN 
                purchase pur ON p.product_id = pur.product_id
            LEFT JOIN 
                suppliers sup ON pur.supplier_id = sup.supplier_id
            WHERE 
                s.Damage_Qty > 0 AND p.isActive = 1
            GROUP BY
                p.product_id
            ORDER BY
                s.Damage_Qty DESC
        `);
        res.json(items);
    } catch (error) {
        console.error('Error fetching damaged items:', error);
        res.status(500).json({ error: 'Database error while fetching damaged items.' });
    }
};

// Request Replacement for Damaged Items
exports.requestReplacement = async (req, res) => {
    const { productId, quantity, supplierId, description } = req.body;
    
    try {
        await pool.execute(
            `UPDATE purchase 
             SET replacement_provided	 = 1, 
                 damage_description = ?,
                 replacement_date = NOW()
             WHERE product_id = ? AND supplier_id = ? AND is_damaged = 1
             ORDER BY purchase_date DESC
             LIMIT ?`,
            [description, productId, supplierId, quantity]
        );
        
        res.json({ message: 'Replacement request submitted successfully.' });
    } catch (error) {
        console.error('Error requesting replacement:', error);
        res.status(500).json({ error: 'Database error while requesting replacement.' });
    }
};

// Get Replacement History
exports.getReplacementHistory = async (req, res) => {
    try {
        const [history] = await pool.execute(`
            SELECT
                p.product_name,
                pur.quantity,
                pur.purchase_date as replacement_date,
                pur.Invoice_Number,
                s.supplier_name,
                pur.damage_description,
                pur.is_free_replacement
            FROM
                purchase pur
            JOIN
                products p ON pur.product_id = p.product_id
            JOIN
                suppliers s ON pur.supplier_id = s.supplier_id
            WHERE
                pur.replacement_provided = 1
            ORDER BY
                pur.replacement_date DESC
        `);
        res.json(history);
    } catch (error) {
        console.error('Error fetching replacement history:', error);
        res.status(500).json({ error: 'Database error while fetching replacement history.' });
    }
};


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