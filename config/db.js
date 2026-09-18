const mysql = require('mysql2');
require('dotenv').config();

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required database environment variable(s): ${missingEnvVars.join(', ')}`
  );
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Without this, mysql2 returns DECIMAL/NUMERIC columns as strings (to avoid
  // float precision loss), which silently turns `sum + row.amount` into
  // string concatenation instead of addition anywhere a running total is
  // computed in JS. Money fields in this app are well within JS's safe
  // integer/float range, so the precision tradeoff is not a concern here.
  decimalNumbers: true
});

pool.on('error', (err) => {
  console.error('Unexpected MySQL pool error:', err);
});

module.exports = pool.promise();
