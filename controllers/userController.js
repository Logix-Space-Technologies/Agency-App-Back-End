const pool = require('../config/db');
const bcrypt = require('bcrypt');

// User Login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log(req.body)

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Get user by email
        const [users] = await pool.query(
            'SELECT user_id, name, email, password_hash, role, profile_avathar, Place_Of_Allocation FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        console.log(user)

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password_hash);

        console.log(isMatch)
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }



        // Role-based message or routing (customize as needed)
        let redirectPage = '';
        switch (user.role) {
            case 'admin':
                redirectPage = '/admin/dashboard';
                break;
            case 'manager':
                redirectPage = '/manager/home';
                break;
            case 'user':
                redirectPage = '/user/home';
                break;
            default:
                redirectPage = '/home';
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                profile_avathar: user.profile_avathar,
                Place_Of_Allocation: user.Place_Of_Allocation
            },
            redirect: redirectPage
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// Get All Users
exports.getUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT user_id, profile_avathar, name, role, phone, email, password_hash, created_at, Place_Of_Allocation FROM users WHERE isActive = 1');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

// Get All Customers
exports.getCustomers = async (req, res) => {
    try {
                const { mobile } = req.body;

        const [customers] = await pool.query(
            'SELECT `id`, `Name`, `Place`, `Mobile`, `EmailId` FROM `Customers` WHERE `Mobile` = ? OR `Name` LIKE ?',
            [mobile, `%${mobile}%`]
        );
        
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

// Search User
exports.searchUser = async (req, res) => {
    try {
        const { user_data } = req.body;
        if (!user_data) return res.status(400).json({ error: "User data is required" });

        const [result] = await pool.query(
            `SELECT user_id, profile_avathar, name, role, phone, email, password_hash, created_at, Place_Of_Allocation
             FROM users
             WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ? OR Place_Of_Allocation LIKE ?)  AND isActive = 1`,
            [`%${user_data}%`, `%${user_data}%`, `%${user_data}%`, `%${user_data}%`]
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

// Add New User
exports.addUser = async (req, res) => {
    try {
        const { profile_avathar, name, role, phone, email, password_hash, Place_Of_Allocation } = req.body;

        if (!name || !email || !password_hash) {
            return res.status(400).json({ error: "Name, email, and password are required" });
        }

        // Check if email already exists
        const [existingUsers] = await pool.query(
            'SELECT email FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password_hash, saltRounds);

        // Insert user with hashed password
        const [result] = await pool.query(
            `INSERT INTO users (profile_avathar, name, role, phone, email, password_hash, created_at, Place_Of_Allocation)
             VALUES (?, ?, ?, ?, ?, ?, now(), ?)`,
            [profile_avathar, name, role, phone, email, hashedPassword, Place_Of_Allocation]
        );

        res.json({ message: 'User added successfully', user_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};



// Delete User
exports.deleteUser = async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: "User ID is required" });

        await pool.query('UPDATE users SET isActive = 0 WHERE user_id = ?', [user_id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
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
            Place_Of_Allocation
        } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const query = `
            UPDATE users 
            SET profile_avathar = ?, 
                name = ?, 
                role = ?, 
                phone = ?, 
                email = ?, 
                Place_Of_Allocation = ? 
            WHERE user_id = ?
        `;

        const values = [profile_avathar, name, role, phone, email, Place_Of_Allocation, user_id];

        await pool.query(query, values);

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error("Edit User Error:", error);
        res.status(500).json({ error: 'Database error' });
    }
};
