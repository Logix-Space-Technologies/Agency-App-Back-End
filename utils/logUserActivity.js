// src/utils/logUserActivity.js
const pool = require("../config/db");
const { getClientIp } = require("../utils/getClientIp");
const { getISTTimestamp } = require("../utils/dateUtils");

const logUserActivity = async ({ req, user_id, action }) => {
  try {
        const ip_address = getClientIp(req);
        const created_at = getISTTimestamp();

        await pool.query(
          `INSERT INTO user_activity_log (user_id, action, ip_address, created_at)
          VALUES (?, ?, ?, ?)`,
          [user_id, action, ip_address, created_at]
        );
      } catch (error) {
        console.error("Activity log failed:", error);
      }
};

module.exports = { logUserActivity };