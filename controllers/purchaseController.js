const pool = require("../config/db");

/* =====================================================
   ENHANCED PURCHASE
===================================================== */
exports.createEnhancedPurchase = async (req, res) => {
  const {
    supplierId,
    invoiceNumber,
    purchaseDetails,
    isReplacement,
    compensationType,
    compensationDetails,
  } = req.body;

  if (!supplierId || !purchaseDetails?.length) {
    return res.status(400).json({ error: "Missing required purchase data." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const item of purchaseDetails) {
      const {
        productId,
        quantity,
        purchasePrice,
        totalAmount,
        isDamaged,
        isFreeItem,
        damageDescription,
      } = item;

      if (!productId || !quantity) {
        throw new Error("Missing productId or quantity");
      }

      // Check damaged stock for replacement
      if (isReplacement) {
        const [[stock]] = await connection.execute(
          "SELECT Damage_Qty FROM stock WHERE product_id=?",
          [productId]
        );
        if (!stock || stock.Damage_Qty < quantity) {
          throw new Error("Insufficient damaged quantity");
        }
      }

      const [result] = await connection.execute(
        `INSERT INTO purchase (
          product_id, purchase_date, purchase_price, total_amount, quantity,
          Invoice_Number, supplier_id, is_damaged, damage_description,
          replacement_provided, replacement_date, is_free_replacement,
          is_freebie, compensation_type, compensation_details
        ) VALUES (?,NOW(),?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          productId,
          isReplacement || isFreeItem ? 0 : purchasePrice,
          isReplacement || isFreeItem ? 0 : totalAmount,
          quantity,
          invoiceNumber,
          supplierId,
          isDamaged || false,
          isDamaged ? damageDescription : null,
          isReplacement || false,
          isReplacement ? new Date() : null,
          isReplacement || false,
          isFreeItem || false,
          compensationType || null,
          compensationDetails
            ? JSON.stringify(compensationDetails)
            : null,
        ]
      );

      const purchaseId = result.insertId;

      // Stock update
      if (isReplacement) {
        await connection.execute(
          "UPDATE stock SET Damage_Qty = Damage_Qty - ? WHERE product_id=?",
          [quantity, productId]
        );
      } else if (isDamaged) {
        await connection.execute(
          "UPDATE stock SET quantity = quantity - ?, Damage_Qty = Damage_Qty + ? WHERE product_id=?",
          [quantity, quantity, productId]
        );
      } else {
        await connection.execute(
          "UPDATE stock SET quantity = quantity + ? WHERE product_id=?",
          [quantity, productId]
        );
      }

      await connection.execute(
        `INSERT INTO stock_History
         (stock_Id, Qty, stock_type, AddedDate, AddedBy, CreditOrDebit, ReferenceInvoiceOrSale, purchase_id)
         VALUES (?,?,?,NOW(),0,?,?,?)`,
        [
          productId,
          quantity,
          isReplacement ? "replacement" : isDamaged ? "damage" : "purchase",
          isReplacement || isDamaged ? "Debit" : "Credit",
          invoiceNumber,
          purchaseId,
        ]
      );
    }

    await connection.commit();
    res.json({ message: "Purchase processed successfully" });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

/* =====================================================
   GET ALL PURCHASES (FIXED)
===================================================== */
exports.getAllPurchases = async (req, res) => {
  try {
    const page = Number(req.body.page) || 1;
    const limit = Number(req.body.limit) || 15;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM purchase WHERE isActive=1"
    );

    const [rows] = await pool.query(
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
      `
    );

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

/* =====================================================
   FILTERED PURCHASES (FIXED)
===================================================== */
exports.getAllPurchasesByValues = async (req, res) => {
  try {
    const { supplier, product, fromDate, toDate } = req.body;
    const page = Number(req.body.page) || 1;
    const limit = Number(req.body.limit) || 15;
    const offset = (page - 1) * limit;

    let where = "WHERE p.isActive=1";
    const params = [];

    if (supplier) {
      where += " AND s.supplier_name=?";
      params.push(supplier);
    }
    if (product) {
      where += " AND pr.product_name LIKE ?";
      params.push(`%${product}%`);
    }
    if (fromDate && toDate) {
      where += " AND DATE(p.purchase_date) BETWEEN ? AND ?";
      params.push(fromDate, toDate);
    }

    const [[{ total }]] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM purchase p
      JOIN suppliers s ON p.supplier_id=s.supplier_id
      JOIN products pr ON pr.product_id=p.product_id
      ${where}
      `,
      params
    );

    const [rows] = await pool.query(
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
      JOIN suppliers s ON p.supplier_id=s.supplier_id
      JOIN products pr ON pr.product_id=p.product_id
      ${where}
      ORDER BY p.purchase_date DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      params
    );

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

/* =====================================================
   REPLACEMENT HISTORY (FIXED)
===================================================== */
exports.getReplacementHistory = async (req, res) => {
  try {
    const page = Number(req.body.page) || 1;
    const limit = Number(req.body.limit) || 10;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `
      SELECT
        p.product_name,
        pur.quantity,
        pur.purchase_date,
        pur.Invoice_Number,
        s.supplier_name,
        pur.damage_description,
        pur.is_free_replacement
      FROM purchase pur
      JOIN products p ON pur.product_id=p.product_id
      JOIN suppliers s ON pur.supplier_id=s.supplier_id
      WHERE pur.replacement_provided=1
      ORDER BY pur.id DESC
      LIMIT ${limit} OFFSET ${offset}
      `
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

/* =====================================================
   REQUEST REPLACEMENT (FIXED)
===================================================== */
exports.requestReplacement = async (req, res) => {
  const { productId, quantity, supplierId, description } = req.body;

  try {
    await pool.query(
      `
      UPDATE purchase
      SET replacement_provided=1,
          damage_description=?,
          replacement_date=NOW()
      WHERE product_id=? AND supplier_id=? AND is_damaged=1
      ORDER BY purchase_date DESC
      LIMIT ${Number(quantity)}
      `,
      [description, productId, supplierId]
    );

    res.json({ message: "Replacement request submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
