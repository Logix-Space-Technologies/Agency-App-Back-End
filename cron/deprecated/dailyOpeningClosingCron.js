/**
 * Daily Opening & Closing Stock Cron
 * Run once per day (or multiple times – safe)
 */

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

/* ---------------- MAIN LOGIC ---------------- */
async function runDailyOpeningClosing() {
  //const connection = await mysql.createConnection(dbConfig);
  const today = getISTDate(-1);

  console.log("Running Opening/Closing Stock for:", today);
  let connection;
  try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
    /* 1️⃣ Get all active products */
    const [products] = await connection.execute(`
      SELECT product_id
      FROM products
      WHERE isActive = 1
    `);

    if (!products.length) {
      console.log("No active products found.");
      await connection.commit();
      return;
    }

    for (const { product_id } of products) {
      /* 2️⃣ Opening Stock */
      const [prev] = await connection.execute(
        `
        SELECT closing_stock
        FROM opening_closing_balance
        WHERE product_id = ?
        AND date < ?
        ORDER BY date DESC
        LIMIT 1
        `,
        [product_id, today]
      );

      let openingStock = 0;

        if (prev.length) {
        openingStock = prev[0].closing_stock;
        } else {
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

        openingStock = stock ? Number(stock.available_qty) : 0;
        }

    /* 3️⃣ Purchases */
      const [[purchase]] = await connection.execute(
        `
        SELECT IFNULL(SUM(quantity),0) AS purchase_qty
        FROM purchase
        WHERE product_id = ?
        AND purchase_date = ?
        AND isActive = 1
        AND is_damaged = 0
        `,
        [product_id, today]
      );

      /* 4️⃣ Sales / Damage / Loss */
      const [[sales]] = await connection.execute(
        `
        SELECT
          IFNULL(SUM(quantity_sold),0) AS sold_qty,
          IFNULL(SUM(damaged_count),0) AS damage_qty,
          IFNULL(SUM(loss_count),0) AS loss_qty
        FROM sales
        WHERE product_id = ?
        AND sale_date = ?
        AND isActive = 1
        `,
        [product_id, today]
      );

      /* 5️⃣ Miscellaneous Damage */
      const [[misc]] = await connection.execute(
        `
        SELECT IFNULL(SUM(quantity),0) AS misc_damage_qty
        FROM miscellaneous_damage
        WHERE product_id = ?
        AND addedDate >= CONCAT(?, ' 00:00:00')
        AND addedDate <= CONCAT(?, ' 23:59:59')
        AND isActive = 1
        `,
        [product_id, today, today]
      );
      const opening = Number(openingStock) || 0;
      const purchaseQty = Number(purchase.purchase_qty) || 0;
      const soldQty = Number(sales.sold_qty) || 0;
      const damageQty = Number(sales.damage_qty) || 0;
      const lossQty = Number(sales.loss_qty) || 0;
      const miscDamageQty = Number(misc.misc_damage_qty) || 0;
      /* 6️⃣ Closing Stock */
      const closingStock =
        (opening + purchaseQty) -
        soldQty -
        damageQty -
        lossQty -
        miscDamageQty;

      /* 6️⃣ Insert / Update */
      await connection.execute(
        `
        INSERT INTO opening_closing_balance
        (
          product_id,
          date,
          opening_stock,
          closing_stock,
          purchase_qty,
          sold_qty,
          damage_qty,
          loss_qty,
          misc_damage_qty
        )
        VALUES (?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          opening_stock = VALUES(opening_stock),
          closing_stock = VALUES(closing_stock),
          purchase_qty = VALUES(purchase_qty),
          sold_qty = VALUES(sold_qty),
          damage_qty = VALUES(damage_qty),
          loss_qty = VALUES(loss_qty),
          misc_damage_qty = VALUES(misc_damage_qty)
        `,
        [
          product_id,
          today,
          openingStock,
          closingStock,
          purchase.purchase_qty,
          sales.sold_qty,
          sales.damage_qty,
          sales.loss_qty,
          misc.misc_damage_qty
        ]
      );

      console.log(`✔ Product ${product_id} updated`);
    }
    await connection.commit();
    console.log("✅ Daily Opening/Closing completed successfully");

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("❌ Error running cron:", err);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

/* ---------------- RUN ---------------- */
runDailyOpeningClosing();