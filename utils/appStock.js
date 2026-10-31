// Stock the office can actually sell: total in the store, less stock allocated to marketing
// staff and not yet sold, less damaged. Same definition as the Stock page.
const CURRENT_STOCK_SQL = (productCol) => `(
  COALESCE((SELECT SUM(st.quantity - COALESCE(st.Damage_Qty, 0)) FROM stock st
            WHERE st.product_id = ${productCol} AND st.isActive = 1), 0)
  - COALESCE((SELECT SUM(d.allocated_quantity) FROM daily_stock_allocation d
              WHERE d.product_id = ${productCol} AND d.converted_to_sales = 0 AND d.isActive = 1), 0)
)`;

module.exports = { CURRENT_STOCK_SQL };
