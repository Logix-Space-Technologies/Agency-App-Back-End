// A settled app invoice becomes a normal sale in the office system. If the office later deletes that
// sale, final_sale.isActive goes to 0. The app invoice row itself is untouched, so "deleted" is worked
// out from the sale rather than stored; nothing has to be changed in the database for it.
const deletedByAdmin = (alias) =>
  `(${alias}.status = 'settled' AND ${alias}.final_sale_tracking_id IS NOT NULL AND EXISTS (` +
  `SELECT 1 FROM final_sale fsd WHERE fsd.sale_tracking_Id = ${alias}.final_sale_tracking_id COLLATE utf8mb4_general_ci AND fsd.isActive = 0))`;

const statusExpr = (alias) => `CASE WHEN ${deletedByAdmin(alias)} THEN 'deleted' ELSE ${alias}.status END`;

module.exports = { deletedByAdmin, statusExpr };
