const pool = require("../config/db");
const bcrypt = require("bcrypt");

// User Login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(req.body);

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

    console.log(user);

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);

    console.log(isMatch);
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
      "SELECT user_id, profile_avathar, name, role, phone, email, password_hash, created_at, Place_Of_Allocation, isBlocked FROM users WHERE isActive = 1"
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
    //console.log(req.body)
    const [users] = await pool.query(
      "SELECT user_id, profile_avathar, name, role, phone, email, password_hash, created_at, Place_Of_Allocation, isBlocked FROM users WHERE isActive = 1 AND user_id = ?",
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
      `SELECT user_id, profile_avathar, name, role, phone, email, password_hash, created_at, Place_Of_Allocation, isBlocked
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

    // Insert user with hashed password
    const [result] = await pool.query(
      `INSERT INTO users (profile_avathar, name, role, phone, email, password_hash, created_at, Place_Of_Allocation)
             VALUES (?, ?, ?, ?, ?, ?, now(), ?)`,
      [
        profile_avathar,
        name,
        role,
        phone,
        email,
        hashedPassword,
        Place_Of_Allocation,
      ]
    );

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

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = `
            UPDATE users 
            SET profile_avathar = ?, 
                name = ?, 
                role = ?, 
                phone = ?, 
                email = ?,
                password_hash = ?, 
                Place_Of_Allocation = ?,
                modified_date = now(),
                addedBy = ? 
            WHERE user_id = ?
        `;

    const values = [
      profile_avathar,
      name,
      role,
      phone,
      email,
      hashedPassword,
      Place_Of_Allocation,
      loggedInUserId,
      user_id,
    ];

    await pool.query(query, values);

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Edit User Error:", error);
    res.status(500).json({ error: "Database error" });
  }
};

// Search User
exports.getMenuItems = async (req, res) => {
  try {
    const { role } = req.body;
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

  res.json(Object.values(navMap));
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

exports.updateUserAccess = async (req, res) => {
  try {
    const { accessList } = req.body;
    if (!Array.isArray(accessList)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    try {

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
          const [result] = await pool.query(addRoleParentSQL, [parentId]);
          totalParentAffected += (result && result.affectedRows) || 0;
        } else {
          const [result] = await pool.query(removeRoleParentSQL, [parentId]);
          totalParentAffected += (result && result.affectedRows) || 0;
        }

        // Children update
        if (Array.isArray(menu.children)) {
          for (const child of menu.children) {
            if (child.childUserAccess === 1) {
              const [result] = await pool.query(addRoleChildSQL, [child.href, parentId]);
              totalChildAffected += (result && result.affectedRows) || 0;
            } else {
              const [result] = await pool.query(removeRoleChildSQL, [child.href, parentId]);
              totalChildAffected += (result && result.affectedRows) || 0;
            }
          }
        }
      }

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
    } catch (err) {
      await pool.rollback();
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
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
    const { userId, isBlocked } = req.body;
    console.log(req.body)

    if (!userId || (isBlocked !== 0 && isBlocked !== 1)) {
      return res.status(400).json({ error: "User ID and block status are required" });
    }

    // Update user block status
    await pool.query("UPDATE users SET isBlocked = ? WHERE user_id = ?", [
      isBlocked,
      userId,
    ]);

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
    const { role, route } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }
    const [rows] = await pool.query(
      `SELECT href FROM menu_items WHERE href IS NOT NULL AND FIND_IN_SET(?, access_roles) > 0`,
      [role]
    );
    if (!route) {
      return res
        .status(400)
        .json({ success: false, message: "Route is required" });
    }

    let hrefList = rows || [];
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