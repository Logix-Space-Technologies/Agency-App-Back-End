const pool = require("../config/db"); // Assuming your db.js exports the promise pool

// Enhanced purchase controller with all scenarios
exports.createEnhancedPurchase = async (req, res) => {
  const {
    supplierId,
    invoiceNumber,
    purchaseDetails,
    addedBy,
    isReplacement,
    isFreebie,
    relatedPurchaseId, // For linking to original purchase
    compensationType, // 'replacement', 'discount', 'freebie', 'partial'
    compensationDetails,
  } = req.body;

  if (!supplierId || !purchaseDetails || purchaseDetails.length === 0) {
    return res.status(400).json({ error: "Missing required purchase data." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Process each item in the purchase
    for (const item of purchaseDetails) {
      const {
        productId,
        quantity,
        purchasePrice,
        totalAmount,
        isDamaged,
        isFreeItem,
        originalPurchaseId,
        damageDescription,
        freebieRatio, // e.g., "5:1" for 5 damaged get 1 free
      } = item;

      // Validate required fields
      if (!productId || !quantity) {
        await connection.rollback();
        connection.release();
        return res
          .status(400)
          .json({ error: "Missing product ID or quantity." });
      }

      // Check stock for replacement scenarios
      if (isReplacement) {
        const [stock] = await connection.execute(
          "SELECT Damage_Qty FROM stock WHERE product_id = ?",
          [productId]
        );

        if (stock.length === 0 || stock[0].Damage_Qty < quantity) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            error: `Cannot replace ${quantity} items. Only ${
              stock[0]?.Damage_Qty || 0
            } damaged items available.`,
          });
        }
      }

      // Insert purchase record with enhanced fields
      const [purchaseResult] = await connection.execute(
        `INSERT INTO purchase (
                    product_id, purchase_date, purchase_price, total_amount, quantity,
                    Invoice_Number, supplier_id, is_damaged, damage_description,
                    replacement_provided, replacement_date, is_free_replacement,
                    is_freebie, related_purchase_id, compensation_type, compensation_details
                ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          isReplacement || isFreeItem ? 0 : purchasePrice, // Free items have 0 price
          isReplacement || isFreeItem ? 0 : totalAmount,
          quantity,
          invoiceNumber,
          supplierId,
          isDamaged || false,
          isDamaged ? damageDescription || "Damaged item" : null,
          isReplacement || false,
          isReplacement ? new Date() : null,
          isReplacement,
          isFreeItem || false,
          relatedPurchaseId || null,
          compensationType || null,
          compensationDetails ? JSON.stringify(compensationDetails) : null,
        ]
      );

      const purchaseId = purchaseResult.insertId;


      // Handle stock updates based on purchase type
      if (isReplacement) {
        // For replacements, reduce damaged quantity
        await connection.execute(
          "UPDATE stock SET Damage_Qty = Damage_Qty - ? WHERE product_id = ?",
          [quantity, productId]
        );
      } else if (isDamaged) {
        // For damaged items, move to Damage_Qty
        await connection.execute(
          "UPDATE stock SET quantity = quantity - ?, Damage_Qty = Damage_Qty + ? WHERE product_id = ?",
          [quantity, quantity, productId]
        );
      } else if (isFreeItem) {
        // For freebies, increase stock without affecting financials
        await connection.execute(
          "UPDATE stock SET quantity = quantity + ? WHERE product_id = ?",
          [quantity, productId]
        );
      } else {
        // Normal purchase
        await connection.execute(
          "UPDATE stock SET quantity = quantity + ? WHERE product_id = ?",
          [quantity, productId]
        );
      }

      // Record in stock history with appropriate type
      let stockType;
      if (isReplacement) stockType = "replacement";
      else if (isDamaged) stockType = "damage";
      else if (isFreeItem) stockType = "freebie";
      else stockType = "purchase";

      await connection.execute(
        `INSERT INTO stock_History (
                    stock_Id, Qty, stock_type, AddedDate, AddedBy,
                    CreditOrDebit, ReferenceInvoiceOrSale, purchase_id
                ) VALUES (?, ?, ?, NOW(), ?, ?, ?,?)`,
        [
          productId,
          quantity,
          stockType,
          0,
          isReplacement || isDamaged ? "Debit" : "Credit",
          invoiceNumber,
          purchaseId
        ]
      );
    }

    await connection.commit();
    connection.release();
    res.status(201).json({ message: "Purchase processed successfully!" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("Error in enhanced purchase process:", error);
    res.status(500).json({ error: "Database error during purchase process." });
  }
};

// New endpoint to handle freebie calculations
exports.calculateFreebies = async (req, res) => {
  const { productId, purchasedQuantity, freebieRatio } = req.body;

  try {
    // Parse ratio (e.g., "5:1" means 5 purchased = 1 free)
    const [purchaseReq, freeQty] = freebieRatio.split(":").map(Number);

    if (!purchaseReq || !freeQty) {
      return res
        .status(400)
        .json({ error: 'Invalid freebie ratio format. Use "X:Y".' });
    }

    const freebieQuantity =
      Math.floor(purchasedQuantity / purchaseReq) * freeQty;

    res.json({
      freebieQuantity,
      description: `Buy ${purchaseReq}, get ${freeQty} free`,
    });
  } catch (error) {
    console.error("Error calculating freebies:", error);
    res.status(500).json({ error: "Error calculating freebie quantity." });
  }
};

// Enhanced damaged items endpoint
exports.getEnhancedDamagedItems = async (req, res) => {
  try {
    const [items] = await pool.execute(`
            SELECT 
                p.product_id, 
                p.product_name,
                p.product_image,
                s.Damage_Qty as damaged_quantity,
                s.quantity as current_stock,
                MAX(pur.purchase_date) as last_purchase_date,
                MAX(pur.Invoice_Number) as last_invoice,
                sup.supplier_name,
                sup.supplier_id,
                sup.replacement_policy,
                GROUP_CONCAT(DISTINCT pur.compensation_type) as compensation_options
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

    // Process compensation options
    const processedItems = items.map((item) => {
      return {
        ...item,
        compensation_options: item.compensation_options
          ? [...new Set(item.compensation_options.split(",").filter(Boolean))]
          : [],
      };
    });

    res.json(processedItems);
  } catch (error) {
    console.error("Error fetching damaged items:", error);
    res
      .status(500)
      .json({ error: "Database error while fetching damaged items." });
  }
};

// Create a New Purchase with Support for Replacements
exports.createPurchaseNew = async (req, res) => {
  console.log("test");
  const { supplierId, invoiceNumber, purchaseDetails, addedBy, isReplacement } =
    req.body;

  if (!supplierId || !purchaseDetails || purchaseDetails.length === 0) {
    return res.status(400).json({ error: "Missing required purchase data." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const item of purchaseDetails) {
      const { productId, quantity, purchasePrice, totalAmount, isDamaged } =
        item;

      // Validate replacement quantity against Damage_Qty
      if (isReplacement) {
        const [stock] = await connection.execute(
          "SELECT Damage_Qty FROM stock WHERE product_id = ?",
          [productId]
        );

        if (stock.length === 0 || stock[0].Damage_Qty < quantity) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            error: `Cannot replace ${quantity} items. Only ${
              stock[0]?.Damage_Qty || 0
            } damaged items available for product ID ${productId}.`,
          });
        }
      }

      if (!productId || !quantity) {
        await connection.rollback();
        connection.release();
        return res
          .status(400)
          .json({ error: "Missing details for a purchase item." });
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
          isReplacement ? 0 : totalAmount, // Zero total for replacements
          quantity,
          invoiceNumber,
          supplierId,
          isDamaged || false,
          isDamaged ? "Damaged item" : null,
          isReplacement || false,
          isReplacement ? new Date() : null,
          isReplacement,
        ]
      );

      // Update stock based on purchase type
      if (isReplacement) {
        // For replacements, reduce damaged quantity
        await connection.execute(
          "UPDATE stock SET Damage_Qty = Damage_Qty - ? WHERE product_id = ?",
          [quantity, productId]
        );
      } else if (isDamaged) {
        // For damaged items, move to Damage_Qty
        await connection.execute(
          "UPDATE stock SET quantity = quantity - ?, Damage_Qty = Damage_Qty + ? WHERE product_id = ?",
          [quantity, quantity, productId]
        );
      }

      // else {
      // Normal purchase - increase regular quantity
      await connection.execute(
        "UPDATE stock SET quantity = quantity + ? WHERE product_id = ?",
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
          isReplacement ? "replacement" : isDamaged ? "damage" : "purchase",
          0,
          isReplacement || isDamaged ? "Debit" : "Credit",
          invoiceNumber,
        ]
      );
    }

    await connection.commit();
    connection.release();
    res.status(201).json({ message: "Purchase processed successfully!" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("Error in purchase process:", error);
    res.status(500).json({ error: "Database error during purchase process." });
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
        MAX(s.Damage_Qty) as damaged_quantity,
        MAX(pur.purchase_date) as last_purchase_date,
        MAX(pur.Invoice_Number) as last_invoice,
        MAX(sup.supplier_name) as supplier_name,
        MAX(sup.supplier_id) as supplier_id,
        MAX(s.quantity) as current_stock
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
        p.product_id, p.product_name, p.product_image
    ORDER BY
        damaged_quantity DESC
        
        `);
    res.json(items);
  } catch (error) {
    console.error("Error fetching damaged items:", error);
    res
      .status(500)
      .json({ error: "Database error while fetching damaged items." });
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

    res.json({ message: "Replacement request submitted successfully." });
  } catch (error) {
    console.error("Error requesting replacement:", error);
    res
      .status(500)
      .json({ error: "Database error while requesting replacement." });
  }
};

// Get Replacement History
exports.getReplacementHistory = async (req, res) => {
  const { page = 1, limit = 10, startDate, endDate, supplierName } = req.body;
  const offset = (page - 1) * limit;

  let conditions = `pur.replacement_provided = 1`;
  const params = [];

  if (startDate && endDate) {
    conditions += ` AND pur.purchase_date BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }

  if (supplierName) {
    conditions += ` AND s.supplier_name LIKE ?`;
    params.push(`%${supplierName}%`);
  }

  try {
    const [history] = await pool.execute(
      `
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
                ${conditions}
            ORDER BY pur.id DESC
            LIMIT ? OFFSET ?
        `,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json(history);
  } catch (error) {
    console.error("Error fetching replacement history:", error);
    res
      .status(500)
      .json({ error: "Database error while fetching replacement history." });
  }
};

// Get All Active Purchases with Supplier and Product Name
exports.getAllPurchases = async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 15;
    const offset = (page - 1) * limit;

    // Count query
    const [[{ total }]] = await pool.execute(`
      SELECT COUNT(*) AS total
      FROM purchase
      WHERE isActive = 1
    `);

    // Data query
    const [purchases] = await pool.execute(
      `
      SELECT
        pr.product_name,
        pr.product_id,
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
      FROM purchase p
      JOIN suppliers s ON p.supplier_id = s.supplier_id
      JOIN products pr ON pr.product_id = p.product_id
      WHERE p.isActive = 1
      ORDER BY p.purchase_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
 
    );

    res.json({
      data: purchases,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ error: "Database error." });
  }
};

// Get All Active Purchases with Supplier and Product Name
exports.getAllPurchasesByValues = async (req, res) => {
  try {
    const { supplier, product, fromDate, toDate, page = 1, limit = 15 } = req.body;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE p.isActive = 1";
    const params = [];

    if (supplier) {
      whereClause += " AND s.supplier_name = ?";
      params.push(supplier);
    }

    if (product) {
      whereClause += " AND pr.product_name LIKE ?";
      params.push(`%${product}%`);
    }

    if (fromDate && toDate) {
      whereClause += " AND DATE(p.purchase_date) BETWEEN ? AND ?";
      params.push(fromDate, toDate);
    } else if (fromDate) {
      whereClause += " AND DATE(p.purchase_date) >= ?";
      params.push(fromDate);
    } else if (toDate) {
      whereClause += " AND DATE(p.purchase_date) <= ?";
      params.push(toDate);
    }

    // Count
    const [[{ total }]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM purchase p
      JOIN suppliers s ON p.supplier_id = s.supplier_id
      JOIN products pr ON pr.product_id = p.product_id
      ${whereClause}
      `,
      params
    );

    // Data
    const [purchases] = await pool.query(
      `
      SELECT
        pr.product_name,
        pr.product_id,
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
      FROM purchase p
      JOIN suppliers s ON p.supplier_id = s.supplier_id
      JOIN products pr ON pr.product_id = p.product_id
      ${whereClause}
      ORDER BY p.purchase_date DESC
  LIMIT ${limit} OFFSET ${offset}
      `,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching filtered purchases:", error);
    res.status(500).json({ error: "Database error." });
  }
};

// Get All Suppliers (for the dropdown)
exports.getSuppliers = async (req, res) => {
  try {
    const [suppliers] = await pool.execute(
      "SELECT supplier_id, supplier_name FROM suppliers WHERE isActive = 1"
    );
    res.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Database error while fetching suppliers" });
  }
};

// Get All Products (for the dropdown)
exports.getProducts = async (req, res) => {
  try {
    const [products] = await pool.execute(
      "SELECT product_id, product_name FROM products WHERE isActive = 1"
    );
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Database error while fetching products" });
  }
};

// Create a New Purchase with Multiple Items and Update Stock & History
exports.createPurchase = async (req, res) => {
  const { supplierId, invoiceNumber, purchaseDetails, addedBy } = req.body;

  console.log("Received request body in createPurchase:", req.body); // For debugging

  if (
    !supplierId ||
    !invoiceNumber ||
    !purchaseDetails ||
    purchaseDetails.length === 0
  ) {
    return res.status(400).json({ error: "Missing required purchase data." });
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
        return res
          .status(400)
          .json({ error: "Missing details for a purchase item." });
      }

      // Insert into the purchase table
      const [purchaseResult] = await connection.execute(
        "INSERT INTO purchase (product_id, purchase_date, purchase_price, total_amount, quantity, Invoice_Number, supplier_id) VALUES (?, NOW(), ?, ?, ?, ?, ?)",
        [
          productId,
          purchasePrice,
          totalAmount,
          quantity,
          invoiceNumber,
          supplierId,
        ]
      );
      const purchaseItemId = purchaseResult.insertId;

      // Get the current stock quantity before update
      const [currentStock] = await connection.execute(
        "SELECT quantity FROM stock WHERE product_id = ?",
        [productId]
      );
      const oldQuantity =
        currentStock.length > 0 ? parseInt(currentStock[0].quantity) : 0;

      // Update stock
      const [stockUpdateResult] = await connection.execute(
        "UPDATE stock SET quantity = quantity + ?, added_date = NOW() WHERE product_id = ?",
        [quantity, productId]
      );

      // Insert into stock history
      await connection.execute(
        "INSERT INTO stock_History (stock_Id, Qty, stock_type, AddedDate, AddedBy, CreditOrDebit, ReferenceInvoiceOrSale) VALUES (?, ?, ?, NOW(), ?, ?, ?)",
        [productId, quantity, "purchase", 0, "Credit", invoiceNumber]
      );
    }

    // Commit the transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      message:
        "Purchase created, stock updated, and stock history recorded successfully!",
    });
  } catch (error) {
    // If any error occurred, rollback the transaction and release the connection
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error(
      "Error creating purchase, updating stock, and recording history:",
      error
    );
    res.status(500).json({
      error: "Database error during purchase and stock update process.",
    });
  }
};

exports.getPurchaseBills = async (req, res) => {
  try {
    const { supplier_id } = req.body;
    if (!supplier_id)
      return res.status(400).json({ error: "supplier data is required" });

    // Fixed query - either use MAX(id) or order by a grouped column
    const sql = `
      SELECT 
        Invoice_Number, 
        SUM(total_amount) AS totalAmountPerInvoice, 
        AddedDate,
        MAX(id) as latest_id
      FROM purchase 
      WHERE supplier_id = ? AND isActive = 1 
      GROUP BY Invoice_Number, AddedDate 
      ORDER BY latest_id DESC 
      LIMIT 0, 10
    `;

    const [result] = await pool.query(sql, [supplier_id]);
    console.log(result);

    const [totalSum] = await pool.query(
      "SELECT SUM(total_amount) AS total_amount FROM purchase WHERE supplier_id = ? AND isActive=1",
      [supplier_id]
    );
    const totalAmount = totalSum[0]?.total_amount ?? 0;

    const [amtPaid] = await pool.query(
      "SELECT SUM(total_amount) AS amount_paid FROM purchase_settlement WHERE supplier_id = ? AND isActive=1",
      [supplier_id]
    );
    const amount_paid = amtPaid[0]?.amount_paid ?? 0;

    res.json({
      result: result,
      totalAmount,
      amount_paid,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Database error" });
  }
};

// Add Settlement
exports.purchaseSettlement = async (req, res) => {
  try {
    const now = new Date();
    const formattedNow = now.toISOString().replace("T", " ").substring(0, 19);
    const {
      supplier_id,
      cash_amount,
      card_amount,
      upi_amount,
      cheque_amount,
      total_amount,
      remarks,
    } = req.body;
    console.log(req.body);

    if (!supplier_id) {
      return res.status(400).json({ error: "Supplier ID is required" });
    }

    if (!total_amount) {
      return res.status(400).json({ error: "Amount paid is required" });
    }

    //const sql = "Insert into  brands SET brand_name = ? WHERE brand_id = ?";
    // const sql = "INSERT into `purchase_settlement`(`supplier_id`, `total_amount`,`added_date`, `transaction_date`, `transaction_type`, `remarks`, `isActive`) VALUES (?, ?, ?, ?, ?, ?, 1)";

    const sql =
      "INSERT into `purchase_settlement`(`supplier_id`, `cash_amount`, `card_amount`, `upi_amount`, `cheque_amount`, `total_amount`, `added_date`, `transaction_date`, `remarks`, `isActive`) VALUES (?, ?, ?, ?, ?, ?,?,?,?, 1)";

    const [result] = await pool.query(sql, [
      supplier_id,
      cash_amount,
      card_amount,
      upi_amount,
      cheque_amount,
      total_amount,
      formattedNow,
      formattedNow,
      remarks,
      1,
    ]);
    res.json({
      message: "Brand updated successfully",
      brand_id: result.insertId,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Database error" });
  }
};

// Get All TransactionTypes (for the dropdown)
exports.getTransactionTypes = async (req, res) => {
  try {
    const [transactionTypes] = await pool.execute(
      "SELECT `transaction_type_id`, `transaction_type` FROM `transaction_type` WHERE `isActive`=1"
    );
    console.log(transactionTypes);
    res.json(transactionTypes);
  } catch (error) {
    console.error("Error fetching transaction types:", error);
    res
      .status(500)
      .json({ error: "Database error while fetching transaction types" });
  }
};


// Delete purchase
exports.deletePurchase = async (req, res) => {
  let connection;

  try {
    const { purchase_id, product_id, quantity } = req.body;

    if (!purchase_id || !product_id || !quantity) {
      return res.status(400).json({
        error: "purchase_id, product_id and quantity are required",
      });
    }

    // ✅ GET CONNECTION
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1️⃣ Soft delete purchase
    const [purchaseResult] = await connection.execute(
      "UPDATE purchase SET isActive = 0 WHERE id = ?",
      [purchase_id]
    );

    if (purchaseResult.affectedRows === 0) {
      throw new Error("Purchase not found");
    }

    // 2️⃣ Reduce stock quantity
    await connection.execute(
      "UPDATE stock SET quantity = quantity - ? WHERE product_id = ?",
      [quantity, product_id]
    );

    // 3️⃣ Delete stock history for this purchase
    await connection.execute(
      "DELETE FROM stock_History WHERE purchase_id = ?",
      [purchase_id]
    );

    await connection.commit();

    res.json({
      message: "Purchase deleted successfully",
      purchase_id,
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Delete purchase error:", error);
    res.status(500).json({ error: "Database error" });

  } finally {
    if (connection) connection.release();
  }
};
