// Reconstructs day-wise opening/closing stock for a product directly from
// purchase / sales / miscellaneous_damage history, anchored to the live
// `stock` table figure — no pre-computed snapshot table or cron required.
//
// Formula (per product):
//   closing(today)  = current live stock (from `stock` table)
//   net(day)        = purchase_qty(day) - sold_qty(day) - damage_qty(day) - loss_qty(day) - misc_damage_qty(day)
//   closing(D)      = closing(today) - sum(net(day)) for every day after D up to today
//   opening(D)      = closing(D) - net(D)
//
// This mirrors the formula already used (and trusted) by cron/dailyOpeningClosingCron.js
// and cron/runDailyReconciliation.js.

const toDateStr = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().split("T")[0];
};

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
};

async function getCurrentStock(pool, product_id) {
  const [[row]] = await pool.query(
    `SELECT
        (s.quantity - COALESCE(SUM(dsa.allocated_quantity), 0) - COALESCE(s.Damage_Qty, 0)) AS current_stock
     FROM stock s
     LEFT JOIN daily_stock_allocation dsa
       ON s.product_id = dsa.product_id
       AND dsa.converted_to_sales = 0
       AND dsa.isActive = 1
     WHERE s.product_id = ? AND s.isActive = 1
     GROUP BY s.stock_id`,
    [product_id]
  );
  return row ? Number(row.current_stock) || 0 : 0;
}

async function getDailyChangesUpTo(pool, product_id, uptoDate) {
  const [purchaseRows] = await pool.query(
    `SELECT purchase_date AS date, SUM(quantity) AS qty
     FROM purchase
     WHERE product_id = ? AND isActive = 1 AND is_damaged = 0 AND purchase_date <= ?
     GROUP BY purchase_date`,
    [product_id, uptoDate]
  );

  const [salesRows] = await pool.query(
    `SELECT sale_date AS date,
            SUM(quantity_sold) AS sold_qty,
            SUM(damaged_count) AS damage_qty,
            SUM(loss_count) AS loss_qty
     FROM sales
     WHERE product_id = ? AND isActive = 1 AND sale_date <= ?
     GROUP BY sale_date`,
    [product_id, uptoDate]
  );

  const [miscRows] = await pool.query(
    `SELECT DATE(addedDate) AS date, SUM(quantity) AS qty
     FROM miscellaneous_damage
     WHERE product_id = ? AND isActive = 1 AND DATE(addedDate) <= ?
     GROUP BY DATE(addedDate)`,
    [product_id, uptoDate]
  );

  const changesByDate = {};
  const ensure = (d) => {
    if (!changesByDate[d]) {
      changesByDate[d] = { purchase: 0, sold: 0, damage: 0, loss: 0, misc: 0 };
    }
    return changesByDate[d];
  };

  for (const r of purchaseRows) ensure(toDateStr(r.date)).purchase += Number(r.qty) || 0;
  for (const r of salesRows) {
    const e = ensure(toDateStr(r.date));
    e.sold += Number(r.sold_qty) || 0;
    e.damage += Number(r.damage_qty) || 0;
    e.loss += Number(r.loss_qty) || 0;
  }
  for (const r of miscRows) ensure(toDateStr(r.date)).misc += Number(r.qty) || 0;

  return changesByDate;
}

const netOf = (c) => c.purchase - c.sold - c.damage - c.loss - c.misc;

/**
 * Returns an array of { date, opening_stock, closing_stock, purchase_qty, sold_qty,
 * damage_qty, loss_qty, misc_damage_qty } for every calendar day from fromDate to toDate
 * (inclusive), for a single product.
 */
async function reconstructDailyStock(pool, product_id, fromDate, toDate, todayOverride) {
  const today = todayOverride || toDateStr(new Date());

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
