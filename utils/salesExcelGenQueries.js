const pool = require("../config/db");

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * 'SK20260304992,SK20260304993,SK20260304999' → '[SK20260304992 - SK20260304999]'
 * Invoice numbers are alphanumeric (SK...) — sort lexicographically.
 */
function billRange(str) {
  if (!str) return '';
  const parts = str.split(',').map(s => s.trim()).filter(Boolean).sort();
  return parts.length ? `[${parts[0]} - ${parts[parts.length - 1]}]` : '';
}

function r2(v) { return Math.round((parseFloat(v) || 0) * 100) / 100; }

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// ─── Shared subquery: aggregate sales per tracking ID first ──────────────────
// Prevents row multiplication (1 invoice → many sales line items)
const SALES_AGG = `
  SELECT
    s.sale_tracking_Id,
    DATE(CONVERT_TZ(SALE_DATE, '+00:00', '+05:30')) AS sale_date,
    SUM(s.amount_received / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100))
        AS line_taxable,
    SUM(s.amount_received / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100)
        * pp.cgst_percentage / 100)
        AS line_cgst,
    SUM(s.amount_received / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100)
        * pp.sgst_percentage / 100)
        AS line_sgst
  FROM sales s
  JOIN product_prices pp ON s.price_id = pp.price_id
  WHERE s.isActive = 1
  GROUP BY s.sale_tracking_Id
`;

function buildSalesSQL(gstFilter = '') {
  return `
    SELECT
      agg.sale_date,
      GROUP_CONCAT(fs.invoiceNumber ORDER BY fs.invoiceNumber SEPARATOR ',') AS bill_numbers,
      SUM(agg.line_taxable) AS taxable,
      SUM(agg.line_cgst)    AS cgst,
      SUM(agg.line_sgst)    AS sgst
    FROM final_sale fs
    JOIN (${SALES_AGG}) agg ON agg.sale_tracking_Id = fs.sale_tracking_Id
    WHERE agg.sale_date BETWEEN ? AND ?
      AND fs.isActive = 1
      ${gstFilter}
    GROUP BY agg.sale_date
    ORDER BY agg.sale_date
  `;
}

function processSalesRows(rows) {
  return rows.map(r => ({
    sale_date: r.sale_date,
    bill_range: billRange(r.bill_numbers),
    taxable:    r2(r.taxable),
    cgst:       r2(r.cgst),
    sgst:       r2(r.sgst),
  }));
}

// ─── Total Sales (all invoices — GST + non-GST) ──────────────────────────────
async function getTotalSales(from, to) {
  const rows = await query(buildSalesSQL(), [from, to]);
  return processSalesRows(rows);
}

// ─── B2B → isGstBilling = 1 ──────────────────────────────────────────────────
async function getB2B(from, to) {
  const rows = await query(buildSalesSQL('AND fs.isGstBilling = 1'), [from, to]);
  return processSalesRows(rows);
}

// ─── B2C → isGstBilling = 0 ──────────────────────────────────────────────────
async function getB2C(from, to) {
  const rows = await query(buildSalesSQL('AND fs.isGstBilling = 0'), [from, to]);
  return processSalesRows(rows);
}

// ─── HSN B2B → isGstBilling = 1 ──────────────────────────────────────────────
async function getHsnB2B(from, to) {
  const sql = `
    SELECT
      COALESCE(NULLIF(TRIM(p.hsn_code), ''), 'N/A') AS hsn_code,
      p.product_name                                  AS description,
      (pp.cgst_percentage + pp.sgst_percentage)      AS tax_rate,
      SUM(s.quantity_sold)                            AS qty,
      SUM(s.amount_received)                          AS total_value,
      SUM(s.amount_received
          / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100))
          AS taxable,
      SUM(s.amount_received
          / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100)
          * pp.sgst_percentage / 100)
          AS sgst,
      SUM(s.amount_received
          / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100)
          * pp.cgst_percentage / 100)
          AS cgst
    FROM sales s
    JOIN final_sale fs     ON fs.sale_tracking_Id = s.sale_tracking_Id
    JOIN products p        ON s.product_id = p.product_id
    JOIN product_prices pp ON s.price_id   = pp.price_id
    WHERE DATE(CONVERT_TZ(fs.addedDate, '+00:00', '+05:30')) BETWEEN ? AND ?
      AND fs.isActive     = 1
      AND fs.isGstBilling = 1
      AND s.isActive      = 1
    GROUP BY p.hsn_code, p.product_name, pp.cgst_percentage, pp.sgst_percentage
    ORDER BY p.hsn_code
  `;
  const rows = await query(sql, [from, to]);
  return rows.map(r => ({
    hsn_code:    r.hsn_code    || 'N/A',
    description: r.description || '',
    tax_rate:    parseFloat(r.tax_rate)    || 0,
    qty:         parseInt(r.qty)           || 0,
    total_value: r2(r.total_value),
    taxable:     r2(r.taxable),
    sgst:        r2(r.sgst),
    cgst:        r2(r.cgst),
  }));
}

// ─── HSN B2C → isGstBilling = 0 ──────────────────────────────────────────────
async function getHsnB2C(from, to) {
  const sql = `
    SELECT
      COALESCE(NULLIF(TRIM(p.hsn_code), ''), 'N/A') AS hsn_code,
      p.product_name                                  AS description,
      (pp.cgst_percentage + pp.sgst_percentage)      AS tax_rate,
      SUM(s.quantity_sold)                            AS qty,
      SUM(s.amount_received)                          AS total_value,
      SUM(s.amount_received
          / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100))
          AS taxable,
      SUM(s.amount_received
          / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100)
          * (pp.cgst_percentage + pp.sgst_percentage) / 100)
          AS tax_amount,
      SUM(s.amount_received
          / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100)
          * pp.sgst_percentage / 100)
          AS sgst,
      SUM(s.amount_received
          / (1 + (pp.cgst_percentage + pp.sgst_percentage) / 100)
          * pp.cgst_percentage / 100)
          AS cgst
    FROM sales s
    JOIN final_sale fs     ON fs.sale_tracking_Id = s.sale_tracking_Id
    JOIN products p        ON s.product_id = p.product_id
    JOIN product_prices pp ON s.price_id   = pp.price_id
    WHERE DATE(CONVERT_TZ(fs.addedDate, '+00:00', '+05:30')) BETWEEN ? AND ?
      AND fs.isActive     = 1
      AND fs.isGstBilling = 0
      AND s.isActive      = 1
    GROUP BY p.hsn_code, p.product_name, pp.cgst_percentage, pp.sgst_percentage
    ORDER BY p.hsn_code
  `;
  const rows = await query(sql, [from, to]);
  return rows.map(r => ({
    hsn_code:    r.hsn_code    || 'N/A',
    description: r.description || '',
    tax_rate:    parseFloat(r.tax_rate)    || 0,
    qty:         parseInt(r.qty)           || 0,
    total_value: r2(r.total_value),
    taxable:     r2(r.taxable),
    tax_amount:  r2(r.tax_amount),
    sgst:        r2(r.sgst),
    cgst:        r2(r.cgst),
  }));
}

// ─── Stock Value ──────────────────────────────────────────────────────────────
async function getStockValue() {
  const rows = await query(`
    SELECT SUM(st.quantity * pp.purchase_price) AS stock_value
    FROM stock st
    JOIN product_prices pp ON st.price_id = pp.price_id
    WHERE st.isActive = 1 AND pp.isActive = 1
  `);
  return r2(rows[0]?.stock_value || 0);
}

module.exports = { getTotalSales, getB2B, getB2C, getHsnB2B, getHsnB2C, getStockValue };
