const pool = require("../config/db");

/* ---------------- DATE UTILS ---------------- */
function getISTDate(daysOffset = 0) {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;

  const istDate = new Date(`${year}-${month}-${day}`);
  istDate.setDate(istDate.getDate() + daysOffset);

  return istDate.toISOString().split("T")[0];
}

function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/* ---------------- MAIN ---------------- */
async function runClosingSnapshot() {
  const inputDate = process.argv[2];

  const today = isValidDate(inputDate)
    ? inputDate
    : getISTDate(0);

  console.log("📸 Running Closing Snapshot for:", today);

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [products] = await connection.execute(`
      SELECT product_id FROM products WHERE isActive = 1
    `);

    for (const { product_id } of products) {

      const [[stock]] = await connection.execute(
        `
        SELECT
          (
            s.quantity
            - COALESCE(SUM(dsa.allocated_quantity), 0)
            - COALESCE(s.Damage_Qty, 0)
          ) AS available_qty
        FROM stock s
        LEFT JOIN daily_stock_allocation dsa
          ON s.product_id = dsa.product_id
          AND dsa.converted_to_sales = 0
          AND dsa.isActive = 1
        WHERE s.product_id = ?
          AND s.isActive = 1
        GROUP BY s.stock_id
        `,
        [product_id]
      );

      const closingStock = stock ? Number(stock.available_qty) : 0;

      await connection.execute(
        `
        INSERT INTO opening_closing_balance
        (product_id, date, closing_stock, opening_stock, purchase_qty, sold_qty, damage_qty, loss_qty, misc_damage_qty)
        VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0)
        ON DUPLICATE KEY UPDATE
          closing_stock = VALUES(closing_stock)
        `,
        [product_id, today, closingStock]
      );

      console.log(`✔ Snapshot updated for product ${product_id}`);
    }

    await connection.commit();
    console.log("✅ Closing snapshot completed");

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("❌ Snapshot error:", err);
  } finally {
    if (connection) connection.release();
  }
}

runClosingSnapshot();