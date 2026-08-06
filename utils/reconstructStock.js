// Reconstructs day-wise opening/closing stock directly from
// purchase / sales / miscellaneous_damage history, anchored to the live
// `stock` table figure — no pre-computed snapshot table or cron required.
// Supports a single product OR all active products in one efficient pass.
//
// "Stock" here means usable stock: quantity minus outstanding staff
// allocations minus Damage_Qty, matching the convention used everywhere
// else in this codebase (viewAllStocks, etc).
//
// Formula (per product):
//   closing(today)  = current live usable stock
//                    = stock.quantity - outstanding_allocated - stock.Damage_Qty
//   net(day)        = purchase_qty(day) - sold_qty(day) - damage_qty(day) - misc_damage_qty(day)
//   closing(D)      = closing(today) - sum(net(day)) for every day after D up to today
//   opening(D)      = closing(D) - net(D)
//
// Verified against the actual stock-mutation code paths (purchaseController.js,
// salesController.js, dailyStockAllocationController.js, productController.js):
//   - loss_count is tracked via Loss_Qty but is never subtracted from
//     "available"/"usable" stock anywhere else in the app, so it's excluded
//     from the closing_stock math (still reported per-day for breakdown).
//   - isDamaged purchases add +q to both quantity and Damage_Qty (net zero
//     effect on usable stock), so excluding them via `is_damaged = 0` in the
//     purchase query below gives the same result as including them.
//
// Only scans purchase/sales/misc_damage rows within [fromDate, today] — not
// the product's full history — since the anchor (closing(today) = live
// stock) makes anything before fromDate unnecessary for computing the
// requested window.

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

// Anchor matches the Stock Management "Total Stock" formula
// (controllers/stockController.js viewAllStocks): quantity minus outstanding
// (not yet converted to a sale) staff allocations minus Damage_Qty. Kept in
// sync deliberately so this page and Stock Management always agree on
// "current stock" for today.
async function getCurrentStockMap(pool, product_id) {
  const whereProduct = product_id ? "AND s.product_id = ?" : "";
  const params = product_id ? [product_id] : [];
  const [rows] = await pool.query(
    `SELECT s.product_id, p.product_name,
            (
              s.quantity
              - COALESCE(dsa.outstanding_allocated, 0)
              - COALESCE(s.Damage_Qty, 0)
            ) AS current_stock
     FROM stock s
     JOIN products p ON p.product_id = s.product_id
     LEFT JOIN (
       SELECT product_id, SUM(allocated_quantity) AS outstanding_allocated
       FROM daily_stock_allocation
       WHERE converted_to_sales = 0 AND isActive = 1
       GROUP BY product_id
     ) dsa ON dsa.product_id = s.product_id
     WHERE s.isActive = 1 AND p.isActive = 1 ${whereProduct}`,
    params
  );

  const map = {};
  for (const r of rows) {
    map[r.product_id] = {
      product_name: r.product_name,
      currentStock: Number(r.current_stock) || 0,
    };
  }
  return map;
}

// Dates are formatted SERVER-SIDE (DATE_FORMAT) and returned as plain
// 'YYYY-MM-DD' strings rather than JS Date objects. mysql2 returns DATE
// columns as Date objects set to local midnight; converting those with
// .toISOString() (UTC) silently shifts the date backward by a day on any
// server running ahead of UTC (e.g. IST, UTC+5:30) — confirmed by a real
// off-by-one-day bug found during verification. Formatting on the SQL side
// avoids any JS Date/timezone conversion entirely, regardless of what
// timezone the Node process happens to run under.
async function getDailyChangesMap(pool, product_id, fromDate, uptoDate) {
  const productFilter = product_id ? "AND product_id = ?" : "";

  const purchaseParams = product_id
    ? [fromDate, uptoDate, product_id]
    : [fromDate, uptoDate];
  const [purchaseRows] = await pool.query(
    `SELECT product_id, DATE_FORMAT(purchase_date, '%Y-%m-%d') AS date, SUM(quantity) AS qty
     FROM purchase
     WHERE isActive = 1 AND is_damaged = 0 AND purchase_date BETWEEN ? AND ? ${productFilter}
     GROUP BY product_id, purchase_date`,
    purchaseParams
  );

  const salesParams = product_id
    ? [fromDate, uptoDate, product_id]
    : [fromDate, uptoDate];
  const [salesRows] = await pool.query(
    `SELECT product_id, DATE_FORMAT(sale_date, '%Y-%m-%d') AS date,
            SUM(quantity_sold) AS sold_qty,
            SUM(damaged_count) AS damage_qty,
            SUM(loss_count) AS loss_qty
     FROM sales
     WHERE isActive = 1 AND sale_date BETWEEN ? AND ? ${productFilter}
     GROUP BY product_id, sale_date`,
    salesParams
  );

  const miscParams = product_id
    ? [fromDate, uptoDate, product_id]
    : [fromDate, uptoDate];
  const [miscRows] = await pool.query(
    `SELECT product_id, DATE_FORMAT(addedDate, '%Y-%m-%d') AS date, SUM(quantity) AS qty
     FROM miscellaneous_damage
     WHERE isActive = 1 AND DATE(addedDate) BETWEEN ? AND ? ${productFilter}
     GROUP BY product_id, DATE_FORMAT(addedDate, '%Y-%m-%d')`,
    miscParams
  );

  // { [product_id]: { [date]: {purchase,sold,damage,loss,misc} } }
  const map = {};
  const ensure = (pid, d) => {
    if (!map[pid]) map[pid] = {};
    if (!map[pid][d]) map[pid][d] = { purchase: 0, sold: 0, damage: 0, loss: 0, misc: 0 };
    return map[pid][d];
  };

  for (const r of purchaseRows) ensure(r.product_id, r.date).purchase += Number(r.qty) || 0;
  for (const r of salesRows) {
    const e = ensure(r.product_id, r.date);
    e.sold += Number(r.sold_qty) || 0;
    e.damage += Number(r.damage_qty) || 0;
    e.loss += Number(r.loss_qty) || 0;
  }
  for (const r of miscRows) ensure(r.product_id, r.date).misc += Number(r.qty) || 0;

  return map;
}

// loss_count is intentionally NOT subtracted here: Loss_Qty is tracked as its
// own running counter on the stock table and is never subtracted from
// "available"/"usable" stock anywhere else in this codebase (viewAllStocks,
// the deprecated cron scripts, etc). Matching that existing convention rather
// than introducing a different definition of "stock" here. loss_qty is still
// returned per-day for reporting/breakdown purposes.
const netOf = (c) => c.purchase - c.sold - c.damage - c.misc;

function buildProductRows(product_id, product_name, currentStock, changesByDate, fromDate, toDate) {
  const sortedDates = Object.keys(changesByDate).sort();

  let cumulative = 0;
  const cumulativeByDate = {};
  for (const d of sortedDates) {
    cumulative += netOf(changesByDate[d]);
    cumulativeByDate[d] = cumulative;
  }
  const anchor = currentStock - cumulative; // implied stock just before fromDate's window opened

  // All fetched dates are >= fromDate (queries are bounded to [fromDate, today]
  // for efficiency), so runningCumulative correctly starts at 0 here — there's
  // nothing before fromDate in changesByDate to carry forward.
  let runningCumulative = 0;

  const rows = [];
  let cursor = fromDate;
  while (cursor <= toDate) {
    const change = changesByDate[cursor];
    if (change) runningCumulative = cumulativeByDate[cursor];

    const closing = anchor + runningCumulative;
    const net = change ? netOf(change) : 0;
    const opening = closing - net;

    rows.push({
      product_id,
      product_name,
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
  return rows;
}

/**
 * Returns { data: [...] } — day-wise opening/closing stock rows for
 * fromDate..toDate (inclusive). Pass product_id for a single product, or
 * omit it to get every active product in one efficient pass.
 */
async function reconstructDailyStock(pool, product_id, fromDate, toDate, todayOverride) {
  // getISTDate(), not toDateStr(new Date()) — same UTC-shift pitfall noted
  // above, and this is the same IST date helper already used everywhere
  // else in this codebase (stockController.js, the deprecated cron scripts).
  const today = todayOverride || getISTDate();

  const stockMap = await getCurrentStockMap(pool, product_id);
  const changesMap = await getDailyChangesMap(pool, product_id, fromDate, today);

  const data = [];
  for (const pid of Object.keys(stockMap)) {
    const { product_name, currentStock } = stockMap[pid];
    const changesByDate = changesMap[pid] || {};
    data.push(...buildProductRows(pid, product_name, currentStock, changesByDate, fromDate, toDate));
  }

  data.sort((a, b) => (a.product_name < b.product_name ? -1 : a.product_name > b.product_name ? 1 : a.date < b.date ? -1 : 1));

  return { data };
}

module.exports = { reconstructDailyStock, toDateStr, addDays };
