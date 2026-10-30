const pool = require("../config/db");
const { getISTTimestamp } = require("./dateUtils");

const RETENTION_DAYS = 15;
const PURGE_EVERY_MS = 30 * 60 * 1000;
let lastPurge = 0;

// Old rows go whenever a new one is written, at most once every 30 minutes so a busy day does not run a DELETE per tap.
const purgeIfDue = () => {
  const now = Date.now();
  if (now - lastPurge < PURGE_EVERY_MS) return;
  lastPurge = now;
  purgeOldAppLogs().catch((error) => console.error("App log cleanup failed:", error.message));
};

// Never throws: a failed log write must not break the action being logged.
const appLog = async ({ req, staffId, action, details = null, latitude = null, longitude = null }) => {
  try {
    const device = req && req.headers ? req.headers["x-app-device"] || null : null;
    await pool.query(
      `INSERT INTO app_activity_log (staff_id, action, details, latitude, longitude, device, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        staffId,
        String(action).slice(0, 100),
        details ? String(details).slice(0, 1000) : null,
        latitude,
        longitude,
        device ? String(device).slice(0, 255) : null,
        getISTTimestamp(),
      ]
    );
    purgeIfDue();
  } catch (error) {
    console.error("App log failed:", error.message);
  }
};

// Deletes log rows older than RETENTION_DAYS. Returns the number removed.
const purgeOldAppLogs = async () => {
  const cutoff = getISTTimestamp(new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000));
  const [result] = await pool.query("DELETE FROM app_activity_log WHERE created_at < ?", [cutoff]);
  return result.affectedRows;
};

// Runs once at start-up and then every 6 hours for as long as the server is up.
const startAppLogCleanup = () => {
  const run = async () => {
    try {
      const removed = await purgeOldAppLogs();
      if (removed > 0) console.log(`App activity log: removed ${removed} rows older than ${RETENTION_DAYS} days`);
    } catch (error) {
      console.error("App log cleanup failed:", error.message);
    }
  };
  run();
  const timer = setInterval(run, 6 * 60 * 60 * 1000);
  timer.unref();
};

module.exports = { appLog, purgeOldAppLogs, startAppLogCleanup, RETENTION_DAYS };
