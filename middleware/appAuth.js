const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const TOKEN_DAYS = 30;

const getSecret = () => {
  const secret = process.env.APP_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("APP_JWT_SECRET is not set in the server .env file");
  }
  return secret;
};

const signToken = (user) =>
  jwt.sign({ id: user.user_id, role: user.role }, getSecret(), {
    expiresIn: `${TOKEN_DAYS}d`,
  });

// Verifies the bearer token and re-checks the user row on every request, so a
// blocked or deleted salesperson is locked out immediately, not when the token expires.
const requireStaff = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Login required" });

    let payload;
    try {
      payload = jwt.verify(token, getSecret());
    } catch (e) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    const [rows] = await pool.query(
      "SELECT user_id, name, role, phone, email, isActive, isBlocked FROM users WHERE user_id = ?",
      [payload.id]
    );
    const user = rows[0];
    if (!user || user.isActive !== 1 || user.isBlocked === 1) {
      return res.status(401).json({ message: "This login is blocked. Contact the office." });
    }
    req.staff = user;
    next();
  } catch (error) {
    console.error("appAuth error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signToken, requireStaff };
