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

function getDateOffset(baseDate, offset) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

/* ---------------- MAIN ---------------- */
async function runDailyReconciliation() {
  const inputDate = process.argv[2];

  const targetDate = isValidDate(inputDate)
    ? getDateOffset(inputDate, -1)
    : getISTDate(-1);

  const previousDate = isValidDate(inputDate)
    ? getDateOffset(inputDate, -2)
    : getISTDate(-2);

  console.log("🔄 Running reconciliation for:", targetDate);

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [products] = await connection.execute(`
      SELECT product_id FROM products WHERE isActive = 1
    `);

    for (const { product_id } of products) {

      /* STRICT previous day */
      const [[prev]] = await connection.execute(
        `
        SELECT closing_stock
        FROM opening_closing_balance
        WHERE product_id = ?
        AND date = ?
        LIMIT 1
        `,
        [product_id, previousDate]
      );

      const openingStock = prev ? Number(prev.closing_stock) : 0;

      const [[purchase]] = await connection.execute(
        `
        SELECT IFNULL(SUM(quantity),0) AS purchase_qty
        FROM purchase
        WHERE product_id = ?
          AND purchase_date = ?
          AND isActive = 1
          AND is_damaged = 0
        `,
        [product_id, targetDate]
      );

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
        [product_id, targetDate]
      );

      const [[misc]] = await connection.execute(
        `
        SELECT IFNULL(SUM(quantity),0) AS misc_damage_qty
        FROM miscellaneous_damage
        WHERE product_id = ?
          AND addedDate >= CONCAT(?, ' 00:00:00')
          AND addedDate <= CONCAT(?, ' 23:59:59')
          AND isActive = 1
        `,
        [product_id, targetDate, targetDate]
      );

      const purchaseQty = Number(purchase.purchase_qty);
      const soldQty = Number(sales.sold_qty);
      const damageQty = Number(sales.damage_qty);
      const lossQty = Number(sales.loss_qty);
      const miscDamageQty = Number(misc.misc_damage_qty);

    //   const closingStock =
    //     openingStock +
    //     purchaseQty -
    //     soldQty -
    //     damageQty -
    //     lossQty -
    //     miscDamageQty;

      await connection.execute(
        `
        INSERT INTO opening_closing_balance
        (
          product_id,
          date,
          opening_stock,
          purchase_qty,
          sold_qty,
          damage_qty,
          loss_qty,
          misc_damage_qty
        )
        VALUES (?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          opening_stock = VALUES(opening_stock),
          purchase_qty = VALUES(purchase_qty),
          sold_qty = VALUES(sold_qty),
          damage_qty = VALUES(damage_qty),
          loss_qty = VALUES(loss_qty),
          misc_damage_qty = VALUES(misc_damage_qty)
        `,
        [
          product_id,
          targetDate,
          openingStock,
          purchaseQty,
          soldQty,
          damageQty,
          lossQty,
          miscDamageQty
        ]
      );

      console.log(`✔ Reconciled product ${product_id}`);
    }

    await connection.commit();
    console.log("✅ Reconciliation completed");

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("❌ Reconciliation error:", err);
  } finally {
    if (connection) connection.release();
  }
}

runDailyReconciliation();