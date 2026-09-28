// src/utils/logUserActivity.js
const pool = require("../config/db");
const { getClientIp } = require("../utils/getClientIp");
const { getISTTimestamp } = require("../utils/dateUtils");

// reference_type/reference_id let a log entry point back at the actual
// record it describes (a sale, purchase, user, etc.) so the log viewer can
// look up full details instead of just showing the one-line action text.
const logUserActivity = async ({ req, user_id, action, reference_type = null, reference_id = null }) => {
  try {
        // req.socket.remoteAddress can come back undefined in some proxy
        // setups; ip_address is NOT NULL, so that silently failed every
        // insert (confirmed via ER_BAD_NULL_ERROR in production logs).
        const ip_address = getClientIp(req) || "0.0.0.0";
        const created_at = getISTTimestamp();

        await pool.query(
          `INSERT INTO user_activity_log (user_id, action, ip_address, created_at, reference_type, reference_id)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [user_id, action, ip_address, created_at, reference_type, reference_id]
        );
      } catch (error) {
        console.error("Activity log failed:", error);
      }
};

module.exports = { logUserActivity };