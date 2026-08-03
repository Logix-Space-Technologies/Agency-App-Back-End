const { config } = require("dotenv");
const pool = require("../config/db");

const { v4: uuidv4 } = require("uuid");
const { getISTTimestamp, getISTDate } = require('../utils/dateUtils');
const { logUserActivity } = require("../utils/logUserActivity");

const dayjs    = require('dayjs');
const {
  getTotalSales, getB2B, getB2C,
  getHsnB2B, getHsnB2C, getStockValue,
} = require('../utils/salesExcelGenQueries');
const { generateGstExcel } = require('../utils/excelBuilder');

// ── Validate date params ──────────────────────────────────────────────────────
function validateDates(from, to) {
  if (!from || !to) return '"From" and "To" Dates are required.';
  if (!dayjs(from).isValid() || !dayjs(to).isValid()) return 'Invalid date format. Use YYYY-MM-DD';
  if (dayjs(to).isBefore(dayjs(from))) return '"to" must be on or after "from"';
  return null;
}

exports.fetchGstReport = async (req, res) => {
  try {
    const { fromDate: from, toDate: to } = req.body.params || {};

    const err = validateDates(from, to);
    if (err) return res.status(400).json({ error: err });

    const [totalSales, b2b, b2c, hsnB2B, hsnB2C, stockValue] = await Promise.all([
      getTotalSales(from, to),
      getB2B(from, to),
      getB2C(from, to),
      getHsnB2B(from, to),
      getHsnB2C(from, to),
      getStockValue(),
    ]);

    const wb = await generateGstExcel({ totalSales, b2b, b2c, hsnB2B, hsnB2C, stockValue, toDate: to });

    const filename = `GST_Report_${from}_to_${to}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();

  } catch (e) {
    console.error('[GST Excel Error]', e);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};