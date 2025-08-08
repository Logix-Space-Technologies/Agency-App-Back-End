const pool = require("../config/db");

exports.calculateMarketingSalary = async (req, res) => {
  try {
    const { staffId, calculationType, startDate, endDate } = req.body;

    if (!staffId) {
      return res.status(400).json({ error: "Marketing staff ID is required." });
    }

    let dateCondition = "";
    const queryParams = [staffId];

    switch (calculationType) {
      case "daily":
        if (!startDate)
          return res
            .status(400)
            .json({ error: "Start date is required for daily calculation." });
        dateCondition = " AND DATE(s.sale_date) = ?";
        queryParams.push(startDate);
        break;
      case "weekly":
      case "monthly":
      case "custom":
        if (!startDate || !endDate)
          return res
            .status(400)
            .json({
            error:
              "Start and end dates are required for this calculation type.",
          });
        dateCondition = " AND DATE(s.sale_date) BETWEEN ? AND ?";
        queryParams.push(startDate, endDate);
        break;
      case "all":
        break; // No date condition
      default:
        return res.status(400).json({ error: "Invalid calculation type." });
    }

    let query = `
            SELECT
                s.sale_id,
                s.sale_date,
                s.quantity_sold,
                pp.commision_rate,
                p.product_name -- Assuming you have a product table and want to include the name
            FROM sales s
            JOIN product_prices pp ON s.price_id = pp.price_id
            -- Assuming a join to a products table
            LEFT JOIN products p ON pp.product_id = p.product_id 
            WHERE s.marketing_staff_id = ? AND s.isActive = 1 ${dateCondition}
            ORDER BY s.sale_date ASC
        `;

    const [sales] = await pool.query(query, queryParams);

    let totalCommission = 0;
    for (const sale of sales) {
      totalCommission += sale.quantity_sold * sale.commision_rate;
    }

    res.json({
      staffId,
      totalCommission,
      sales,
      calculationType,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Error calculating marketing salary:", error);
    res.status(500).json({ error: "Database error while calculating salary." });
  }
};

exports.getAllMarketingStaff = async (req, res) => {
  try {
    const [staff] = await pool.query(
      "SELECT `user_id`, `profile_avathar`, `name`, `role`, `phone`, `email`, `password_hash`, `created_at`, `Place_Of_Allocation`, `isActive` FROM `users` WHERE role = ? AND isActive = 1",
      ["marketing_staff"]
    );
    res.json(staff);
  } catch (error) {
    console.error("Error fetching marketing staff:", error);
    res
      .status(500)
      .json({ error: "Database error while fetching marketing staff." });
  }
};

exports.addUserSalary = async (req, res) => {
  try {
    const { staff, month, year, date, amount, remarks } = req.body;
    const now = new Date();
    if (!staff || !amount) {
      return res
        .status(400)
        .json({ error: "Satff name and amount are required" });
    }
    // Check if salary entry already exists
    const [existingAddedSalary] = await pool.query(
      "SELECT Amount FROM salary WHERE Month = ? AND Year = ? AND UserId = ?",
      [month, year, staff]
    );

    if (existingAddedSalary.length > 0) {
      return res
        .status(409)
        .json({ error: "Salary already added for this month and year" });
    } else {
      // Insert user salary
      const [result] = await pool.query(
        "INSERT into `salary` (`UserId`, `Date`, `Amount`, `Remarks`, `AddedDate`, `Month`, `Year`) VALUES (?, now(), ?, ?, ?, ?,?)",
        [staff, amount, remarks, date, month, year]
      );

      res.json({
        message: "User Salary added successfully",
        user_id: result.insertId,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

exports.updateStaffSalary = async (req, res) => {
  try {
    const { id, Month, Year, AddedDate, Amount, Remarks } = req.body;
    console.log(req.body);
    console.log(AddedDate);
    const formattedDate = AddedDate.split("T")[0];
    console.log(formattedDate);

    const now = new Date();
    if (!id || !Amount) {
      return res
        .status(400)
        .json({ error: "Staff name and amount are required" });
    }

    const [result] = await pool.query(
      "UPDATE `salary` SET `Date` = NOW(), `Amount` = ?, `Remarks` = ?, `AddedDate` = ?, `Month` = ?, `Year` = ? WHERE `id` = ?",
      [Amount, Remarks, formattedDate, Month, Year, id]
    );

    res.json({
      message: "User Salary updated successfully",
      user_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Salary
exports.searchUserSalaryDetails = async (req, res) => {
  try {
    const { user_data } = req.body;
    if (!user_data)
      return res.status(400).json({ error: "User data is required" });

    const [result] = await pool.query(
      `SELECT u.name,s.UserId, s.id,s.Amount, s.Month, s.Year, DATE_FORMAT(s.AddedDate, '%Y-%m-%d') AS AddedDate,s.Remarks FROM salary s JOIN users u ON s.UserId= u.user_id WHERE  (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.Place_Of_Allocation LIKE ?) AND u.isActive = 1`,
      [`%${user_data}%`, `%${user_data}%`, `%${user_data}%`, `%${user_data}%`]
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

exports.checkForSalaryExist = async (req, res) => {
  try {
    const { month, year, userId } = req.body;
    if (!userId || !month || !year) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [rows] = await pool.query(
      "SELECT Amount FROM salary WHERE Month = ? AND Year = ? AND UserId = ?",
      [month, year, userId]
    );

    if (rows.length > 0) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }

  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};
