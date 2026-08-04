/**
 * One-off verification script — NOT wired into app.js, NOT a cron job.
 * Compares the new on-demand stock reconstruction (utils/reconstructStock.js)
 * against the existing, cron-populated opening_closing_balance table for the
 * same product/date combinations, and reports any mismatches.
 *
 * Run manually:
 *   node scripts/verifyReconstructedStock.js
 */

const pool = require("../config/db");
const { reconstructDailyStock } = require("../utils/reconstructStock");

async function main() {
  const [rows] = await pool.query(`
    SELECT product_id, date, opening_stock, closing_stock
    FROM opening_closing_balance
    ORDER BY product_id, date
  `);

  if (rows.length === 0) {
    console.log("No rows found in opening_closing_balance — nothing to verify against.");
    await pool.end();
    return;
  }

  // Group stored rows by product_id
  const byProduct = {};
  for (const r of rows) {
    const dateStr = r.date instanceof Date ? r.date.toISOString().split("T")[0] : r.date;
    if (!byProduct[r.product_id]) byProduct[r.product_id] = [];
    byProduct[r.product_id].push({ ...r, date: dateStr });
  }

  let totalCompared = 0;
  let totalMismatches = 0;
  const mismatchDetails = [];

  for (const productId of Object.keys(byProduct)) {
    const stored = byProduct[productId];
    const dates = stored.map((r) => r.date).sort();
    const fromDate = dates[0];
    const toDate = dates[dates.length - 1];

    const { data: reconstructed } = await reconstructDailyStock(
      pool,
      Number(productId),
      fromDate,
      toDate
    );

    const reconstructedByDate = {};
    for (const r of reconstructed) reconstructedByDate[r.date] = r;

    for (const s of stored) {
      const r = reconstructedByDate[s.date];
      totalCompared++;

      if (!r) {
        totalMismatches++;
        mismatchDetails.push({
          product_id: productId,
          date: s.date,
          issue: "No reconstructed row for this date",
        });
        continue;
      }

      const storedOpening = Number(s.opening_stock);
      const storedClosing = Number(s.closing_stock);
      const openingDiff = Math.abs(storedOpening - r.opening_stock);
      const closingDiff = Math.abs(storedClosing - r.closing_stock);

      if (openingDiff > 0.01 || closingDiff > 0.01) {
        totalMismatches++;
        mismatchDetails.push({
          product_id: productId,
          date: s.date,
          stored_opening: storedOpening,
          reconstructed_opening: r.opening_stock,
          stored_closing: storedClosing,
          reconstructed_closing: r.closing_stock,
        });
      }
    }
  }

  console.log(`Compared ${totalCompared} (product, date) rows across ${Object.keys(byProduct).length} products.`);
  console.log(`Matches: ${totalCompared - totalMismatches}`);
  console.log(`Mismatches: ${totalMismatches}`);

  if (mismatchDetails.length > 0) {
    console.log("\nMismatch details:");
    console.table(mismatchDetails);
  } else {
    console.log("\n✅ All stored values match the reconstructed values exactly.");
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error("Verification script failed:", err);
  await pool.end();
  process.exit(1);
});
