const pool = require("../config/db");
const bcrypt = require("bcrypt");

const { getISTTimestamp } = require('../utils/dateUtils');
const { logUserActivity } = require("../utils/logUserActivity");

// User Login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get user by email
    const [users] = await pool.query(
      "SELECT user_id, name, email, password_hash, role, profile_avathar, Place_Of_Allocation FROM users WHERE email = ? AND isActive = 1 And isBlocked = 0",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid login credentials" });
    }

    // Role-based message or routing (customize as needed)
    let redirectPage = "";
    switch (user.role) {
      case "admin":
        redirectPage = "/admin-home";
        break;
      case "manager":
        redirectPage = "/manager/home";
        break;
      case "staff":
        redirectPage = "/user-home";
        break;
      case "marketing_staff":
        redirectPage = "/user-home";
        break;  
      default:
        redirectPage = "/";
    }
    
    await logUserActivity({
        req,
        user_id :user.user_id,
        action: `The user ${user.name} is logined`
      });

    res.json({
      message: "Login successful",
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_avathar: user.profile_avathar,
        Place_Of_Allocation: user.Place_Of_Allocation,
      },
      redirect: redirectPage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during login" });
  }
};

// Get All Users
exports.getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT user_id, profile_avathar, name, role, phone, email, created_at, Place_Of_Allocation, isBlocked FROM users WHERE isActive = 1"
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Get A User by ID
exports.getUserByID = async (req, res) => {
  try {
    const { userId } = req.body;
    const [users] = await pool.query(
      "SELECT user_id, profile_avathar, name, role, phone, email, created_at, Place_Of_Allocation, isBlocked FROM users WHERE isActive = 1 AND user_id = ?",
       [userId]
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};
// Get All Customers
exports.getCustomers = async (req, res) => {
  try {
    const { mobile } = req.body;

    const [customers] = await pool.query(
      "SELECT `id`, `Name`, `Place`, `Mobile`, `EmailId` FROM `Customers` WHERE `Mobile` = ? OR `Name` LIKE ?",
      [mobile, `%${mobile}%`]
    );

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Search User
exports.searchUser = async (req, res) => {
  try {
    const { user_data } = req.body;
    if (!user_data)
      return res.status(400).json({ error: "User data is required" });

    const [result] = await pool.query(
      `SELECT user_id, profile_avathar, name, role, phone, email, created_at, Place_Of_Allocation, isBlocked
             FROM users
             WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ? OR Place_Of_Allocation LIKE ?)  AND isActive = 1`,
      [`%${user_data}%`, `%${user_data}%`, `%${user_data}%`, `%${user_data}%`]
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Add New User
exports.addUser = async (req, res) => {
  try {
    const {
      profile_avathar,
      name,
      role,
      phone,
      email,
      password_hash,
      Place_Of_Allocation,
      userId,
    } = req.body;

    if (!name || !email || !password_hash) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    // Check if email already exists
    const [existingUsers] = await pool.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
    const now = getISTTimestamp()

    // Insert user with hashed password
    const [result] = await pool.query(
      `INSERT INTO users (profile_avathar, name, role, phone, email, password_hash, created_at, Place_Of_Allocation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile_avathar,
        name,
        role,
        phone,
        email,
        hashedPassword,
        now,
        Place_Of_Allocation,
      ]
    );
        await logUserActivity({
            req,
            user_id :userId,
            action: `User ${name} is added`
          });
    res.json({ message: "User added successfully", user_id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

// Delete User
exports.deleteUser = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "User ID is required" });

    await pool.query("UPDATE users SET isActive = 0 WHERE user_id = ?", [
      user_id,
    ]);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Edit User
exports.editUser = async (req, res) => {
  try {
    const {
      user_id,
      profile_avathar,
      name,
      role,
      phone,
      email,
      password,
      password_hash,
      Place_Of_Allocation,
      loggedInUserId
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    let query = `
      UPDATE users SET
        profile_avathar = ?,
        name = ?,
        role = ?,
        phone = ?,
        email = ?,
        Place_Of_Allocation = ?,
        modified_date = ?,
        addedBy = ?
    `;

    const values = [
      profile_avathar,
      name,
      role,
      phone,
      email,
      Place_Of_Allocation,
      getISTTimestamp(),
      loggedInUserId
    ];

    // Only update password if provided
    if (password && password.trim() !== "") {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      query += `, password_hash = ?`;
      values.push(hashedPassword);
    }

    query += ` WHERE user_id = ?`;
    values.push(user_id);

    await pool.query(query, values);
    await logUserActivity({
            req,
            user_id :loggedInUserId,
            action: `User ${name}'s data is edited`
          });
    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Edit User Error:", error);
    res.status(500).json({ error: "Database error" });
  }
};

// Search User
exports.getMenuItems = async (req, res) => {
  try {
    const { role, user_id } = req.body;
    if (!role) {
      return res.status(400).json({ error: "Role is required." });
    }
    const [rows] = await pool.query(`
      SELECT 
        parent.id AS parent_id,
        parent.name AS parent_name,
        parent.menu_id AS menu_id,
        parent.short_name,
        FIND_IN_SET('user', parent.access_roles) > 0 AS parent_user_access,
          child.id AS link_id,
          child.name AS link_text,
          child.href AS link_href,
          child.menu_id AS menu_id,
          FIND_IN_SET('user', child.access_roles) > 0 AS child_user_access
      FROM menu_items AS parent
      LEFT JOIN menu_items AS child 
        ON child.parent_id = parent.id
        AND child.isActive = 1
        AND FIND_IN_SET(?, child.access_roles)
      WHERE parent.parent_id IS NULL
        AND parent.isActive = 1
        AND FIND_IN_SET(?, parent.access_roles)
      ORDER BY parent.sort_order, child.sort_order
    `, [role, role]);

  const navMap = {};

  for (const row of rows) {
    const pid = row.parent_id;

    if (!navMap[pid]) {
      navMap[pid] = {
        id: pid,
        name: row.parent_name,
        menuId : row.menu_id,
        shortName: row.short_name || undefined,
        ParentUserAccess: row.parent_user_access ? 1 : 0,
        links: []
      };
    }

    if (row.link_id && row.link_href) {
      navMap[pid].links.push({
        href: row.link_href,
        text: row.link_text,
        childUserAccess: row.child_user_access ? 1 : 0
      });
    }
  }

  // Layer per-user page overrides on top of the role-based menu, so a
  // specific person can be granted a special page without changing their
  // role or anyone else's access.
  if (user_id) {
    const [overrideRows] = await pool.query(`
      SELECT
        p.id AS parent_id,
        p.name AS parent_name,
        p.menu_id AS menu_id,
        p.short_name,
        c.href AS link_href,
        c.name AS link_text
      FROM user_page_access upa
      JOIN menu_items c ON c.href = upa.href AND c.isActive = 1
      JOIN menu_items p ON p.id = c.parent_id AND p.isActive = 1
      WHERE upa.user_id = ? AND upa.isActive = 1
      ORDER BY p.sort_order, c.sort_order
    `, [user_id]);

    for (const row of overrideRows) {
      const pid = row.parent_id;
      if (!navMap[pid]) {
        navMap[pid] = {
          id: pid,
          name: row.parent_name,
          menuId: row.menu_id,
          shortName: row.short_name || undefined,
          ParentUserAccess: 1,
          links: []
        };
      }
      const alreadyPresent = navMap[pid].links.some((l) => l.href === row.link_href);
      if (!alreadyPresent) {
        navMap[pid].links.push({
          href: row.link_href,
          text: row.link_text,
          childUserAccess: 1
        });
      }
    }
  }

  res.json(Object.values(navMap));
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

exports.updateUserAccess = async (req, res) => {
  const { accessList } = req.body;
  if (!Array.isArray(accessList)) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let totalParentAffected = 0;
    let totalChildAffected = 0;

    const addRoleParentSQL = `
      UPDATE menu_items
      SET access_roles = CASE
        WHEN access_roles IS NULL OR access_roles = '' THEN 'user'
        WHEN FIND_IN_SET('user', access_roles) THEN access_roles
        ELSE CONCAT(access_roles, ',user')
      END
      WHERE id = ?`;

    const removeRoleParentSQL = `
      UPDATE menu_items
      SET access_roles = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', IFNULL(access_roles, ''), ','), ',user,', ','))
      WHERE id = ?`;

    const addRoleChildSQL = `
      UPDATE menu_items
      SET access_roles = CASE
        WHEN access_roles IS NULL OR access_roles = '' THEN 'user'
        WHEN FIND_IN_SET('user', access_roles) THEN access_roles
        ELSE CONCAT(access_roles, ',user')
      END
      WHERE href = ? AND parent_id = ?`;

    const removeRoleChildSQL = `
      UPDATE menu_items
      SET access_roles = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', IFNULL(access_roles, ''), ','), ',user,', ','))
      WHERE href = ? AND parent_id = ?`;

    for (const menu of accessList) {
      const parentId = menu.id;

      // Parent update
      if (menu.parentUserAccess === 1) {
        const [result] = await connection.query(addRoleParentSQL, [parentId]);
        totalParentAffected += (result && result.affectedRows) || 0;
      } else {
        const [result] = await connection.query(removeRoleParentSQL, [parentId]);
        totalParentAffected += (result && result.affectedRows) || 0;
      }

      // Children update
      if (Array.isArray(menu.children)) {
        for (const child of menu.children) {
          if (child.childUserAccess === 1) {
            const [result] = await connection.query(addRoleChildSQL, [child.href, parentId]);
            totalChildAffected += (result && result.affectedRows) || 0;
          } else {
            const [result] = await connection.query(removeRoleChildSQL, [child.href, parentId]);
            totalChildAffected += (result && result.affectedRows) || 0;
          }
        }
      }
    }

    await connection.commit();

    // Return informative response
    if (totalParentAffected > 0 || totalChildAffected > 0) {
      return res.json({
        message: "Access updated successfully",
        parentAffected: totalParentAffected,
        childAffected: totalChildAffected,
      });
    } else {
      return res.status(200).json({
        message: "No rows changed (they were already in the desired state).",
        parentAffected: totalParentAffected,
        childAffected: totalChildAffected,
      });
    }
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  } finally {
    if (connection) connection.release();
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { userId, oldPassword, newPassword, confirmPassword } = req.body;

    if (!userId || !oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Get user from DB
    const [users] = await pool.query(
      "SELECT user_id, password_hash FROM users WHERE user_id = ? AND isActive = 1 AND isBlocked = 0",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];

    // Compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update DB
    await pool.query("UPDATE users SET password_hash = ? WHERE user_id = ?  AND isActive = 1  AND isBlocked = 0", [
      hashedPassword,
      userId,
    ]);

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during password change" });
  }
};


// Toggle Block/Unblock User
exports.toggleBlock = async (req, res) => {
  try {
    const { userId, name, isBlocked, loggedInUserId } = req.body;

    if (!userId || (isBlocked !== 0 && isBlocked !== 1)) {
      return res.status(400).json({ error: "User ID and block status are required" });
    }

    // Update user block status
    await pool.query("UPDATE users SET isBlocked = ? WHERE user_id = ?", [
      isBlocked,
      userId,
    ]);
        await logUserActivity({
            req,
            user_id :loggedInUserId,
            action: `User with name ${name}'s block status changed`
          });
    res.json({
      message: isBlocked ? "User blocked successfully" : "User unblocked successfully",
    });
  } catch (error) {
    console.error("Error in toggleBlock:", error);
    res.status(500).json({ error: "Database error" });
  }
};


exports.getLinksForUser = async (req, res) => {
  try {
    const { role, route, userId } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }
    const [rows] = await pool.query(
      `SELECT href FROM menu_items WHERE href IS NOT NULL AND FIND_IN_SET(?, access_roles) > 0`,
      [role]
    );

    let hrefList = rows || [];

    if (userId) {
      const [overrideRows] = await pool.query(
        `SELECT href FROM user_page_access WHERE user_id = ? AND isActive = 1`,
        [userId]
      );
      hrefList = hrefList.concat(overrideRows || []);
    }

    if (!route) {
      return res
        .status(400)
        .json({ success: false, message: "Route is required" });
    }

    //console.log(hrefList);

    const isAllowed = hrefList.some((r) => r.href == route);

    if(isAllowed) {
      return res.json({ result: true });
    } else {
      return res.json({ result: false });
    }
  } catch (error) {
    console.error("Error in toggleBlock:", error);
    res.status(500).json({ error: "Database error" });
  }
};


// Every page in the system, grouped by its parent menu — used by the
// per-user access override UI so an admin can grant any specific person
// any specific page, regardless of role.
exports.getAllMenuLinksFlat = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.href,
        p.id AS parent_id,
        p.name AS parent_name
      FROM menu_items c
      JOIN menu_items p ON p.id = c.parent_id AND p.isActive = 1
      WHERE c.isActive = 1 AND c.href IS NOT NULL
      ORDER BY p.sort_order, c.sort_order
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error in getAllMenuLinksFlat:", error);
    res.status(500).json({ error: "Database error" });
  }
};

// This specific user's current page overrides (beyond their role).
exports.getUserPageOverrides = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const [rows] = await pool.query(
      `SELECT href FROM user_page_access WHERE user_id = ? AND isActive = 1`,
      [userId]
    );
    res.json(rows.map((r) => r.href));
  } catch (error) {
    console.error("Error in getUserPageOverrides:", error);
    res.status(500).json({ error: "Database error" });
  }
};

// Replaces this user's full set of page overrides with the given list of
// hrefs (same "submit the whole set" pattern as the role-based access
// editor), so the UI just needs to send whatever's currently checked.
exports.setUserPageOverrides = async (req, res) => {
  let connection;
  try {
    const { userId, hrefs, addedBy } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (!Array.isArray(hrefs)) return res.status(400).json({ error: "hrefs must be an array" });

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `UPDATE user_page_access SET isActive = 0 WHERE user_id = ?`,
      [userId]
    );

    if (hrefs.length > 0) {
      const values = hrefs.map((href) => [userId, href, 1, addedBy || null, getISTTimestamp()]);
      await connection.query(
        `INSERT INTO user_page_access (user_id, href, isActive, addedBy, created) VALUES ?`,
        [values]
      );
    }

    await connection.commit();
    res.json({ message: "User page access updated successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error in setUserPageOverrides:", error);
    res.status(500).json({ error: "Database error" });
  } finally {
    if (connection) connection.release();
  }
};


exports.deleteOldLogs = async (req, res) => {
  try {
    await pool.query(`
      DELETE FROM user_activity_log
      WHERE created_at < NOW() - INTERVAL 20 DAY
    `);

    return res.status(200).json({
      success: true,
      message: "Old activity logs deleted"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserActivityByDate = async (req, res) => {
  try {
    const { date, page = 1, limit = 10 } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }

    // Validate last 30 days
    const selectedDate = new Date(date);
    const today = new Date();
    const diffDays = (today - selectedDate) / (1000 * 60 * 60 * 24);

    if (diffDays < 0 || diffDays > 30) {
      return res.status(400).json({
        success: false,
        message: "Please select a date within last 30 days"
      });
    }

    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM user_activity_log
      WHERE DATE(created_at) = ?
      `,
      [date]
    );

    const total = countResult[0].total;

    // Get paginated data
    const [rows] = await pool.query(
      `
      SELECT
        u.name,
        TRIM(SUBSTRING_INDEX(l.action, '-', 1)) AS action,
        l.ip_address,
        DATE_FORMAT(l.created_at, '%d-%m-%Y %H:%i:%s') AS created_at
      FROM user_activity_log l
      LEFT JOIN users u ON u.user_id = l.user_id
      WHERE DATE(l.created_at) = ?
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [date, parseInt(limit), parseInt(offset)]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        totalPages: 0,
        message: "No entries found"
      });
    }

    res.json({
      success: true,
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
