const pool = require('../config/db');

// view all
exports.viewAllSuppliers = async (req, res) => {
    try {
        const [suppliers] = await pool.query('SELECT supplier_id, supplier_name, added_Date, contact_number, email_Id, Address FROM suppliers  WHERE isActive = 1');
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });

    }
}

/// Add Supplier
exports.addSuppliers = async (req, res) => {
    try {
        const { supplier_name, contact_number, email_Id, address } = req.body;

        if (!supplier_name) return res.status(400).json({ error: "Supplier name is required" });

        const [result] = await pool.query(
            'INSERT INTO suppliers(supplier_name, added_Date, contact_number, email_Id, Address) VALUES(?, NOW(), ?, ?, ?)',
            [supplier_name, contact_number, email_Id, address]
        );

        res.json({ message: 'Supplier added successfully', supplier_id: result.insertId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};


// search
exports.searchSuppliers = async (req, res) => {
    try {
        const { supplier_name } = req.body;
        if (!supplier_name) return res.status(400).json({ error: "supplier name required" });
        const [result] = await pool.query('SELECT `supplier_id`, `supplier_name`, `added_Date`, `contact_number`, `email_Id`, `Address` FROM `suppliers` WHERE supplier_name LIKE ? AND `isActive` = 1', [`%${supplier_name}%`]);
        res.json(result);
    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}

//delete
exports.deleteSuppliers = async (req, res) => {
    try {
        const { supplier_id } = req.body;
        if (!supplier_id) return res.status(400).json({ error: "supplierid is required" });

    // Check if supplier exists in 'purchase' table
    const [purchase] = await pool.query(
       `SELECT 1 FROM purchase WHERE supplier_id = ?`,
      [supplier_id]
    );
    // Check if supplier exists in 'purchase_settlement' table
    const [settlement] = await pool.query(
       `SELECT 1 FROM purchase_settlement WHERE supplier_id = ?`,
      [supplier_id]
    );

    if ( purchase.length > 0  || settlement.length > 0) {
      return res.status(400).json({ error: "Customer cannot be deleted as it is linked to other records" });
    }


        const [result] = await pool.query('UPDATE `suppliers` SET `isActive` = 0 WHERE `supplier_id`=?', [supplier_id]);
        res.json({ message: 'Supplier deleted successfully', supplier_id: result.insertId });
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}

// Get All Suppliers
exports.getAllSuppliers = async (req, res) => {
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // records per page
    const offset = (page - 1) * limit;
    try {
        // Get paginated data
        const [suppliers] = await pool.query(
        "SELECT supplier_id, supplier_name, added_Date, contact_number, email_Id, Address from suppliers WHERE `isActive`= 1 LIMIT ? OFFSET ?",
        [limit, offset]
        );

        // Get total count for pagination
        const [countResult] = await pool.query(
        "SELECT COUNT(*) as total FROM `suppliers` WHERE `isActive`= 1"
        );
        const total = countResult[0].total;

        res.json({
        suppliers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Database error" });
    }
};

// Edit
exports.editSupplier = async (req, res) => {
  try {
    const {
      supplier_id,
      supplier_name,
      contact_number,
      email_Id,
      Address
    } = req.body;

    if (!supplier_id) {
      return res.status(400).json({ error: "Supplier ID is required" });
    }

    const query = `
            UPDATE suppliers 
            SET supplier_name = ?, 
                contact_number = ?,  
                email_Id = ?,
                Address = ?
            WHERE supplier_id = ?
        `;
    const values = [
      supplier_name,
      contact_number,
      email_Id,
      Address,
      supplier_id
    ];
    await pool.query(query, values);
    res.json({ message: "Supplier updated successfully" });
  } catch (error) {
    console.error("Edit Supplier Error:", error);
    res.status(500).json({ error: "Database error" });
  }
};