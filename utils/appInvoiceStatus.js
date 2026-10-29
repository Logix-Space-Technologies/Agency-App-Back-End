// A settled app invoice becomes a normal sale in the office system. If the office later deletes that
// sale, final_sale.isActive goes to 0. The app invoice row itself is untouched, so "deleted" is worked
// out from the sale rather than stored; nothing has to be changed in the database for it.
const deletedByAdmin = (alias) =>
  `(${alias}.status = 'settled' AND ${alias}.final_sale_tracking_id IS NOT NULL AND EXISTS (` +
  `SELECT 1 FROM final_sale fsd WHERE fsd.sale_tracking_Id = ${alias}.final_sale_tracking_id COLLATE utf8mb4_general_ci AND fsd.isActive = 0))`;

const statusExpr = (alias) => `CASE WHEN ${deletedByAdmin(alias)} THEN 'deleted' ELSE ${alias}.status END`;

// Price checks against the price the invoice was compared with (system_price on each line).
// Any sale below that price is flagged. A sale above it is flagged from the alert percentage up.
const belowPriceSql = (alias) =>
  `EXISTS (SELECT 1 FROM app_invoice_items bx WHERE bx.app_invoice_id = ${alias}.app_invoice_id AND bx.sold_price < bx.system_price - 0.004)`;
const abovePriceSql = (alias, pct) =>
  `EXISTS (SELECT 1 FROM app_invoice_items ax WHERE ax.app_invoice_id = ${alias}.app_invoice_id AND ax.system_price > 0 ` +
  `AND ax.sold_price > ax.system_price AND (ax.sold_price - ax.system_price) / ax.system_price * 100 >= ${Number(pct)})`;

module.exports = { deletedByAdmin, statusExpr, belowPriceSql, abovePriceSql };
