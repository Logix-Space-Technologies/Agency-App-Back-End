// Reconstructs day-wise opening/closing stock for a product directly from
// purchase / sales / miscellaneous_damage history, anchored to the live
// `stock` table figure — no pre-computed snapshot table or cron required.
//
// "Stock" here means usable stock: quantity minus Damage_Qty, matching the
// convention used everywhere else in this codebase (viewAllStocks, etc).
//
// Formula (per product):
//   closing(today)  = current live usable stock = stock.quantity - stock.Damage_Qty
//   net(day)        = purchase_qty(day) - sold_qty(day) - damage_qty(day) - misc_damage_qty(day)
//   closing(D)      = closing(today) - sum(net(day)) for every day after D up to today
//   opening(D)      = closing(D) - net(D)
//
// Verified against the actual stock-mutation code paths (purchaseController.js,
// salesController.js, dailyStockAllocationController.js, productController.js):
//   - daily_stock_allocation never touches stock.quantity (pure reservation row),
//     so it is correctly excluded here.
//   - loss_count is tracked via Loss_Qty but is never subtracted from
//     "available"/"usable" stock anywhere else in the app, so it's excluded
//     from the closing_stock math (still reported per-day for breakdown).
//   - isDamaged purchases add +q to both quantity and Damage_Qty (net zero
//     effect on usable stock), so excluding them via `is_damaged = 0` in the
//     purchase query below gives the same result as including them.

const { getISTDate } = require("./dateUtils");

const toDateStr = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().split("T")[0];
};

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
};

// IMPORTANT: do NOT subtract outstanding daily_stock_allocation here.
// Confirmed by reading the actual write paths: allocating stock to a
// marketing staff member (dailyStockAllocationController.js addDailyStockAllocation)
// only inserts a reservation row — it never touches stock.quantity.
// stock.quantity is only decremented later, at the moment a sale is
// finalized (salesController.js addSalesFromDailyAllocation), using the
// same quantity_sold value that ends up in the `sales` table and that this
// reconstruction already subtracts via getDailyChangesUpTo(). Subtracting
// allocations here as well double-counts them against a metric
// (stock.quantity) they never affected, and was the root cause of the
// drift found during verification (worst on high-volume/high-allocation
// products). Damage_Qty IS subtracted because it never reduces
// stock.quantity directly (stock.quantity only drops via quantity_sold at
// sale time) — Damage_Qty is a separate running counter for the
// unusable/damaged portion of quantity, following the same convention
// used everywhere else in this codebase (viewAllStocks, the deprecated
// cron scripts, etc).
async function getCurrentStock(pool, product_id) {
  const [[row]] = await pool.query(
    `SELECT
        (s.quantity - COALESCE(s.Damage_Qty, 0)) AS current_stock
     FROM stock s
     WHERE s.product_id = ? AND s.isActive = 1`,
    [product_id]
  );
  return row ? Number(row.current_stock) || 0 : 0;
}

// Dates are formatted SERVER-SIDE (DATE_FORMAT) and returned as plain
// 'YYYY-MM-DD' strings rather than JS Date objects. mysql2 returns DATE
// columns as Date objects set to local midnight; converting those with
// .toISOString() (UTC) silently shifts the date backward by a day on any
// server running ahead of UTC (e.g. IST, UTC+5:30) — confirmed by a real
// off-by-one-day bug found during verification. Formatting on the SQL side
// avoids any JS Date/timezone conversion entirely, regardless of what
// timezone the Node process happens to run under.
async function getDailyChangesUpTo(pool, product_id, uptoDate) {
  const [purchaseRows] = await pool.query(
    `SELECT DATE_FORMAT(purchase_date, '%Y-%m-%d') AS date, SUM(quantity) AS qty
     FROM purchase
     WHERE product_id = ? AND isActive = 1 AND is_damaged = 0 AND purchase_date <= ?
     GROUP BY purchase_date`,
    [product_id, uptoDate]
  );

  const [salesRows] = await pool.query(
    `SELECT DATE_FORMAT(sale_date, '%Y-%m-%d') AS date,
            SUM(quantity_sold) AS sold_qty,
            SUM(damaged_count) AS damage_qty,
            SUM(loss_count) AS loss_qty
     FROM sales
     WHERE product_id = ? AND isActive = 1 AND sale_date <= ?
     GROUP BY sale_date`,
    [product_id, uptoDate]
  );

  const [miscRows] = await pool.query(
    `SELECT DATE_FORMAT(addedDate, '%Y-%m-%d') AS date, SUM(quantity) AS qty
     FROM miscellaneous_damage
     WHERE product_id = ? AND isActive = 1 AND DATE(addedDate) <= ?
     GROUP BY DATE_FORMAT(addedDate, '%Y-%m-%d')`,
    [product_id, uptoDate]
  );

  const changesByDate = {};
  const ensure = (d) => {
    if (!changesByDate[d]) {
      changesByDate[d] = { purchase: 0, sold: 0, damage: 0, loss: 0, misc: 0 };
    }
    return changesByDate[d];
  };

  for (const r of purchaseRows) ensure(r.date).purchase += Number(r.qty) || 0;
  for (const r of salesRows) {
    const e = ensure(r.date);
    e.sold += Number(r.sold_qty) || 0;
    e.damage += Number(r.damage_qty) || 0;
    e.loss += Number(r.loss_qty) || 0;
  }
  for (const r of miscRows) ensure(r.date).misc += Number(r.qty) || 0;

  return changesByDate;
}

// loss_count is intentionally NOT subtracted here: Loss_Qty is tracked as its
// own running counter on the stock table and is never subtracted from
// "available"/"usable" stock anywhere else in this codebase (viewAllStocks,
// the deprecated cron scripts, etc). Matching that existing convention rather
// than introducing a different definition of "stock" here. loss_qty is still
// returned per-day for reporting/breakdown purposes.
const netOf = (c) => c.purchase - c.sold - c.damage - c.misc;

/**
 * Returns an array of { date, opening_stock, closing_stock, purchase_qty, sold_qty,
 * damage_qty, loss_qty, misc_damage_qty } for every calendar day from fromDate to toDate
 * (inclusive), for a single product.
 */
async function reconstructDailyStock(pool, product_id, fromDate, toDate, todayOverride) {
  // getISTDate(), not toDateStr(new Date()) — same UTC-shift pitfall as above,
  // and this is the same IST date helper already used everywhere else in
  // this codebase (stockController.js, the deprecated cron scripts, etc).
  const today = todayOverride || getISTDate();

  const currentStock = await getCurrentStock(pool, product_id);
  const changesByDate = await getDailyChangesUpTo(pool, product_id, today);

  const sortedDates = Object.keys(changesByDate).sort();

  let cumulative = 0;
  const cumulativeByDate = {};
  for (const d of sortedDates) {
    cumulative += netOf(changesByDate[d]);
    cumulativeByDate[d] = cumulative;
  }
  const totalNetAllTime = cumulative;
  const anchor = currentStock - totalNetAllTime; // implied stock before any recorded transaction

  // carry-forward cumulative value as of the day before fromDate
  let runningCumulative = 0;
  for (const d of sortedDates) {
    if (d < fromDate) runningCumulative = cumulativeByDate[d];
    else break;
  }

  const result = [];
  let cursor = fromDate;
  while (cursor <= toDate) {
    const change = changesByDate[cursor];
    if (change) {
      runningCumulative = cumulativeByDate[cursor];
    }
    const closing = anchor + runningCumulative;
    const net = change ? netOf(change) : 0;
    const opening = closing - net;

    result.push({
      product_id,
      date: cursor,
      opening_stock: opening,
      closing_stock: closing,
      purchase_qty: change ? change.purchase : 0,
      sold_qty: change ? change.sold : 0,
      damage_qty: change ? change.damage : 0,
      loss_qty: change ? change.loss : 0,
      misc_damage_qty: change ? change.misc : 0,
    });

    cursor = addDays(cursor, 1);
  }

  return { data: result, currentStock, anchor };
}

module.exports = { reconstructDailyStock, toDateStr, addDays };
