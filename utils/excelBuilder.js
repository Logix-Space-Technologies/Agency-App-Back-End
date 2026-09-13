const ExcelJS = require('exceljs');
const dayjs   = require('dayjs');

// ─── Palette & constants ──────────────────────────────────────────────────────
const C = {
  darkBlue:  'FF1F4E79',
  midBlue:   'FF2E75B6',
  lightBlue: 'FFDAE3F3',
  altRow:    'FFF2F7FC',
  white:     'FFFFFFFF',
  black:     'FF000000',
};
const NUM_FMT = '#,##0.00';
const INR_FMT = '₹#,##0.00';

// ─── Style helpers ────────────────────────────────────────────────────────────
const fill  = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const font  = (bold = false, color = C.black, size = 10) =>
              ({ name: 'Arial', bold, color: { argb: color }, size });
const side  = { style: 'thin', color: { argb: 'FFB8CCE4' } };
const bord  = { top: side, left: side, bottom: side, right: side };
const align = (h = 'left', wrap = false) =>
              ({ horizontal: h, vertical: 'middle', wrapText: wrap });

function styleCell(cell, {
  value, bold = false, fg = C.black, bg = null,
  size = 10, h = 'left', numFmt = null, border = true, wrap = false,
} = {}) {
  if (value !== undefined) cell.value = value;
  cell.font      = font(bold, fg, size);
  cell.alignment = align(h, wrap);
  if (bg)     cell.fill   = fill(bg);
  if (numFmt) cell.number_format = numFmt;  // exceljs uses number_format
  if (border) cell.border = bord;
}

// exceljs uses .numFmt on the cell directly
function setNum(cell, value, fmt, h = 'right', bg = null, bold = false) {
  cell.value      = value;
  cell.numFmt     = fmt;
  cell.font       = font(bold, C.black, 10);
  cell.alignment  = align(h);
  if (bg) cell.fill = fill(bg);
  cell.border     = bord;
}

function titleRow(ws, text, cols) {
  ws.mergeCells(`A1:${colLetter(cols)}1`);
  const c = ws.getCell('A1');
  c.value     = text;
  c.font      = font(true, C.white, 11);
  c.fill      = fill(C.midBlue);
  c.alignment = align('center');
  ws.getRow(1).height = 22;
}

function headerRow(ws, headers, widths) {
  headers.forEach((h, i) => {
    ws.getColumn(i + 1).width = widths[i];
    const c = ws.getRow(2).getCell(i + 1);
    c.value     = h;
    c.font      = font(true, C.white, 10);
    c.fill      = fill(C.darkBlue);
    c.alignment = align('center');
    c.border    = bord;
  });
  ws.getRow(2).height = 18;
}

function colLetter(n) {
  // Convert 1-based column index to Excel letter (A, B, ... Z, AA ...)
  let s = '';
  while (n > 0) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function totalRow(ws, rowNum, values, numFmts, aligns) {
  values.forEach((v, i) => {
    const c = ws.getRow(rowNum).getCell(i + 1);
    c.value     = v;
    c.font      = font(true, C.black, 10);
    c.fill      = fill(C.lightBlue);
    c.alignment = align(aligns[i]);
    c.border    = bord;
    if (numFmts[i]) c.numFmt = numFmts[i];
  });
  ws.getRow(rowNum).height = 18;
}

function setDateCell(cell, value, bg = null) {
  const d = dayjs(value);

  // Handle invalid/null safely
  if (!d.isValid()) {
    cell.value = '';
    return;
  }

  cell.value = dayjs(value).format('DD/MM/YYYY');       // ✅ real Date object
  cell.numFmt = 'dd/mm/yyyy';     // ✅ Excel format
  cell.font = font();
  cell.alignment = align('center');
  cell.border = bord;

  if (bg) cell.fill = fill(bg);
}

// ─── Sales sheet (Total Sales / B2B / B2C) ───────────────────────────────────
function buildSalesSheet(ws, title, rows) {
  ws.views = [{ state: 'frozen', ySplit: 2 }];
  titleRow(ws, title, 5);
  headerRow(ws,
    ['Date', 'Bill Nos', 'Taxable Amount', 'CGST Tax', 'SGST Tax'],
    [14,      30,          18,               14,          14]);

  let totTaxable = 0, totCgst = 0, totSgst = 0;

  rows.forEach((r, idx) => {
    const rowNum = idx + 3;
    const bg     = idx % 2 === 1 ? C.altRow : null;
    //const date   = dayjs(r.sale_date).format('DD/MM/YYYY');
    const row = ws.getRow(rowNum);
    setDateCell(row.getCell(1), r.sale_date, bg);
    totTaxable += r.taxable;
    totCgst    += r.cgst;
    totSgst    += r.sgst;

    //const c1  = row.getCell(1); c1.value = date;        c1.font = font(); c1.alignment = align('center'); c1.border = bord; if (bg) c1.fill = fill(bg);
    const c2  = row.getCell(2); c2.value = r.bill_range; c2.font = font(); c2.alignment = align('center'); c2.border = bord; if (bg) c2.fill = fill(bg);
    setNum(row.getCell(3), r.taxable, NUM_FMT, 'right', bg);
    setNum(row.getCell(4), r.cgst,    NUM_FMT, 'right', bg);
    setNum(row.getCell(5), r.sgst,    NUM_FMT, 'right', bg);
    row.height = 16;
  });

  const tr = rows.length + 3;
  totalRow(ws, tr,
    ['TOTAL', '', Math.round(totTaxable * 100) / 100,
               Math.round(totCgst    * 100) / 100,
               Math.round(totSgst    * 100) / 100],
    [null, null, NUM_FMT, NUM_FMT, NUM_FMT],
    ['center', 'center', 'right', 'right', 'right']);
}

// ─── HSN B2B ──────────────────────────────────────────────────────────────────
function buildHsnB2BSheet(ws, rows) {
  ws.views = [{ state: 'frozen', ySplit: 2 }];
  titleRow(ws, 'HSN Summary — B2B (GST Invoices)', 9);
  headerRow(ws,
    ['HSN Code', 'Description', 'Unit', 'Tax %', 'Qty', 'Total Value', 'Taxable', 'SGST', 'CGST'],
    [14,          28,            12,      8,       10,    15,            15,         13,      13]);

  let tot = { qty: 0, val: 0, tax: 0, sgst: 0, cgst: 0 };

  rows.forEach((r, idx) => {
    const rowNum = idx + 3;
    const bg     = idx % 2 === 1 ? C.altRow : null;
    const row    = ws.getRow(rowNum);

    const setText = (col, val, h = 'left') => {
      const c = row.getCell(col);
      c.value = val; c.font = font(); c.alignment = align(h); c.border = bord;
      if (bg) c.fill = fill(bg);
    };

    setText(1, r.hsn_code);
    setText(2, r.description);
    setText(3, 'UNT-UNITS', 'center');
    setText(4, r.tax_rate,  'center');
    setText(5, r.qty,       'center');
    setNum(row.getCell(6), r.total_value, NUM_FMT, 'right', bg);
    setNum(row.getCell(7), r.taxable,     NUM_FMT, 'right', bg);
    setNum(row.getCell(8), r.sgst,        NUM_FMT, 'right', bg);
    setNum(row.getCell(9), r.cgst,        NUM_FMT, 'right', bg);
    row.height = 16;

    tot.qty  += r.qty;   tot.val  += r.total_value;
    tot.tax  += r.taxable; tot.sgst += r.sgst; tot.cgst += r.cgst;
  });

  const rnd = v => Math.round(v * 100) / 100;
  const tr  = rows.length + 3;
  totalRow(ws, tr,
    ['TOTAL', '', '', '', tot.qty, rnd(tot.val), rnd(tot.tax), rnd(tot.sgst), rnd(tot.cgst)],
    [null, null, null, null, null, NUM_FMT, NUM_FMT, NUM_FMT, NUM_FMT],
    ['center','center','center','center','center','right','right','right','right']);
}

// ─── HSN B2C ──────────────────────────────────────────────────────────────────
function buildHsnB2CSheet(ws, rows) {
  ws.views = [{ state: 'frozen', ySplit: 2 }];
  titleRow(ws, 'HSN Summary — B2C (Non-GST Invoices)', 10);
  headerRow(ws,
    ['HSN Code', 'Description', 'Unit', 'Tax %', 'Qty', 'Total Value', 'Taxable', 'Tax Amount', 'SGST', 'CGST'],
    [14,          28,            12,      8,       10,    15,            15,         15,            13,     13]);

  let tot = { qty: 0, val: 0, tax: 0, amt: 0, sgst: 0, cgst: 0 };

  rows.forEach((r, idx) => {
    const rowNum = idx + 3;
    const bg     = idx % 2 === 1 ? C.altRow : null;
    const row    = ws.getRow(rowNum);

    const setText = (col, val, h = 'left') => {
      const c = row.getCell(col);
      c.value = val; c.font = font(); c.alignment = align(h); c.border = bord;
      if (bg) c.fill = fill(bg);
    };

    setText(1, r.hsn_code);
    setText(2, r.description);
    setText(3, 'UNT-UNITS',   'center');
    setText(4, r.tax_rate,    'center');
    setText(5, r.qty,         'center');
    setNum(row.getCell(6),  r.total_value, NUM_FMT, 'right', bg);
    setNum(row.getCell(7),  r.taxable,     NUM_FMT, 'right', bg);
    setNum(row.getCell(8),  r.tax_amount,  NUM_FMT, 'right', bg);
    setNum(row.getCell(9),  r.sgst,        NUM_FMT, 'right', bg);
    setNum(row.getCell(10), r.cgst,        NUM_FMT, 'right', bg);
    row.height = 16;

    tot.qty  += r.qty;       tot.val  += r.total_value;
    tot.tax  += r.taxable;   tot.amt  += r.tax_amount;
    tot.sgst += r.sgst;      tot.cgst += r.cgst;
  });

  const rnd = v => Math.round(v * 100) / 100;
  const tr  = rows.length + 3;
  totalRow(ws, tr,
    ['TOTAL', '', '', '', tot.qty, rnd(tot.val), rnd(tot.tax), rnd(tot.amt), rnd(tot.sgst), rnd(tot.cgst)],
    [null, null, null, null, null, NUM_FMT, NUM_FMT, NUM_FMT, NUM_FMT, NUM_FMT],
    ['center','center','center','center','center','right','right','right','right','right']);
}

// ─── Stock Value ──────────────────────────────────────────────────────────────
function buildStockSheet(ws, value, toDate) {
  ws.getColumn(1).width = 40;
  ws.getColumn(2).width = 22;

  ws.mergeCells('A1:B1');
  const t = ws.getCell('A1');
  t.value     = 'Stock Value Summary';
  t.font      = font(true, C.white, 11);
  t.fill      = fill(C.midBlue);
  t.alignment = align('center');
  ws.getRow(1).height = 22;

  const label = ws.getRow(3).getCell(1);
  label.value = `Stock value as on ${dayjs(toDate).format('DD MMM YYYY')}`;
  label.font      = font(true, C.black, 11);
  label.alignment = align('left');
  label.border    = bord;

  const val = ws.getRow(3).getCell(2);
  val.value     = value;
  val.numFmt    = INR_FMT;
  val.font      = font(true, C.black, 11);
  val.alignment = align('right');
  val.border    = bord;

  ws.getRow(3).height = 22;
}

// ─── Misc Expense Vouchers ──────────────────────────────────────────────────────
function buildExpenseSheet(ws, rows) {
  ws.views = [{ state: 'frozen', ySplit: 2 }];
  titleRow(ws, 'Misc Expense Vouchers', 6);
  headerRow(ws,
    ['Date', 'Voucher No', 'Category', 'Description', 'Amount', 'GST Amount'],
    [14,      16,           20,          32,             16,       16]);

  let totAmount = 0, totGst = 0;

  rows.forEach((r, idx) => {
    const rowNum = idx + 3;
    const bg     = idx % 2 === 1 ? C.altRow : null;
    const row    = ws.getRow(rowNum);

    setDateCell(row.getCell(1), r.expense_date, bg);

    const setText = (col, val, h = 'left') => {
      const c = row.getCell(col);
      c.value = val; c.font = font(); c.alignment = align(h, true); c.border = bord;
      if (bg) c.fill = fill(bg);
    };

    setText(2, r.voucher_number, 'center');
    setText(3, r.expense_category_name);
    setText(4, r.description || '');
    setNum(row.getCell(5), r.amount,     NUM_FMT, 'right', bg);
    setNum(row.getCell(6), r.gst_amount, NUM_FMT, 'right', bg);
    row.height = 16;

    totAmount += Number(r.amount) || 0;
    totGst    += Number(r.gst_amount) || 0;
  });

  const rnd = v => Math.round(v * 100) / 100;
  const tr  = rows.length + 3;
  totalRow(ws, tr,
    ['TOTAL', '', '', '', rnd(totAmount), rnd(totGst)],
    [null, null, null, null, NUM_FMT, NUM_FMT],
    ['center', 'center', 'center', 'center', 'right', 'right']);
}

// ─── Main export ──────────────────────────────────────────────────────────────
async function generateGstExcel({ totalSales, b2b, b2c, hsnB2B, hsnB2C, stockValue, toDate, expenseVouchers = [] }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AgencyDb GST Report';
  wb.created = new Date();

  buildSalesSheet(wb.addWorksheet('Total Sales'), 'Total Sales',              totalSales);
  buildSalesSheet(wb.addWorksheet('B2B'),          'B2B — GST Invoices',      b2b);
  buildSalesSheet(wb.addWorksheet('B2C'),          'B2C — Non-GST Invoices',  b2c);
  buildHsnB2BSheet(wb.addWorksheet('HSN B2B'),    hsnB2B);
  buildHsnB2CSheet(wb.addWorksheet('HSN B2C'),    hsnB2C);
  buildStockSheet(wb.addWorksheet('Stock Value'), stockValue, toDate);
  buildExpenseSheet(wb.addWorksheet('Misc Expenses'), expenseVouchers);

  return wb;
}

module.exports = { generateGstExcel };
