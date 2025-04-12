const pool = require('../config/db');

// view all
exports.viewAllSuppliers = async (req, res) => {
    try {
        const [suppliers] = await pool.query('SELECT supplier_id, supplier_name, added_Date, contact_number, email_Id, Address FROM suppliers');
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });

    }
}

//add suppliers
exports.addSuppliers = async (req, res) => {
    try {
        const { supplier_name, contact_number, email_Id, Address } = req.body;
        if (!supplier_name) return res.status(400).json({ error: "supplier name required" });
        const added_Date = new Date();
        const [result] = await pool.query('INSERT INTO suppliers(supplier_name, added_Date, contact_number, email_Id, Address) VALUES(?,?,?,?,?)',
            [supplier_name, added_Date, contact_number, email_Id, Address]);
        res.json({ message: 'supplier added successfully', supplier_id: result.insertId });

    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}

// search
exports.searchSuppliers = async (req, res) => {
    try {
        const { supplier_name } = req.body;
        if (!supplier_name) return res.status(400).json({ error: "supplier name required" });
        const [result] = await pool.query('SELECT `supplier_id`, `supplier_name`, `added_Date`, `contact_number`, `email_Id`, `Address` FROM `suppliers` WHERE supplier_name LIKE ?', [`%${supplier_name}%`]);
        res.json(result);
    } catch (error) {
        console.error(error);

        res.status(500).json({ error: 'Database error' });
    }
}

//delete
exports.delSuppliers = async (req, res) => {
    try {
        const { supplier_id } = req.body;
        if (!supplier_id) return res.status(400).json({ error: "supplierid is required" });
        const [result] = await pool.query('DELETE FROM `suppliers` WHERE `supplier_id`=?', [supplier_id]);
        res.json({ message: 'Brand deleted successfully', supplier_id: result.insertId });
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
}