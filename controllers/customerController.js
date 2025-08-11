const pool = require("../config/db");
const bcrypt = require("bcrypt");

// Get All Customers
exports.getAllCustomers = async (req, res) => {
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // records per page
    const offset = (page - 1) * limit;

    try {
        // Get paginated data
        const [customers] = await pool.query(
        "SELECT `id`, `Name`, `Place`, `Mobile`, `EmailId` FROM `Customers` WHERE `isActive`= 1 LIMIT ? OFFSET ?",
        [limit, offset]
        );

        // Get total count for pagination
        const [countResult] = await pool.query(
        "SELECT COUNT(*) as total FROM `Customers` WHERE `isActive`= 1"
        );
        const total = countResult[0].total;

        res.json({
        customers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Database error" });
    }
};

// Get Customers
exports.getCustomers = async (req, res) => {
  try {
    const { mobile } = req.body;
    

    const [customers] = await pool.query(
      "SELECT `id`, `Name`, `Place`, `Mobile`, `EmailId` FROM `Customers` WHERE `Mobile` = ? OR `Name` LIKE ? OR `Place` LIKE ?",
      [mobile, `%${mobile}%`]
    );

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Search Customer
exports.searchCustomer = async (req, res) => {
  try {
    const { user_data } = req.body;
    if (!user_data)
      return res.status(400).json({ error: "Customer data is required" });

    const [result] = await pool.query(
      "SELECT id, Name, Place, Mobile, EmailId FROM Customers WHERE (Name LIKE ? OR EmailId LIKE ? OR Mobile LIKE ? OR Place LIKE ?)  AND isActive = 1",
      [`%${user_data}%`, `%${user_data}%`, `%${user_data}%`, `%${user_data}%`]
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};


// Delete Customer
exports.deleteCustomer = async (req, res) => {
  try {
    const { customer_id } = req.body;
    if (!customer_id) return res.status(400).json({ error: "Customer ID is required" });
    
    // Check if customer exists in 'final' table
    const [finalSale] = await pool.query(
       `SELECT 1 FROM sales S
        JOIN final_sale FS ON S.sale_tracking_Id = FS.sale_tracking_Id
        LEFT JOIN Customers C ON FS.UserId = C.id
        WHERE  C.id = ?`,
      [customer_id]
    );

    if ( finalSale.length > 0) {
      return res.status(400).json({ error: "Customer cannot be deleted as it is linked to other records" });
    }

    await pool.query("UPDATE Customers SET isActive = 0 WHERE id = ?", [
      customer_id,
    ]);
    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Edit Customer
exports.editCustomer = async (req, res) => {
  try {
    const {
      id,
      Name,
      Place,
      Mobile,
      EmailId
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const query = `
            UPDATE Customers 
            SET Name = ?, 
                Place = ?, 
                Mobile = ?, 
                EmailId = ?
            WHERE id = ?
        `;

    const values = [
      Name,
      Place,
      Mobile,
      EmailId,
      id
    ];
    await pool.query(query, values);

    res.json({ message: "Customer updated successfully" });
  } catch (error) {
    console.error("Edit Customer Error:", error);
    res.status(500).json({ error: "Database error" });
  }
};


