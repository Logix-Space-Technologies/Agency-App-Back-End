const pool = require("../config/db");
const puppeteer = require("puppeteer");
const { ZipArchive } = require("archiver");
const { amountToWords } = require("../utils/numberToWords");
// Kept in sync manually with src/components/headerInfo.js on the frontend
const headerInfo = {
  agencyName: "Sree Kailasam Agencies",
  address: "Mamood, Erumakuzhy , Nooranad PO, Alappuzha 690504",
  phone: " 9447608738 , 9847154715 , 0479-2387042 ",
  gstNumber: "32DSDPS2166F1ZU",
};

// In-memory job store for bulk-download progress. A single pm2 process, no
// queue/redis needed for this volume - jobs are short-lived (finished or
// abandoned within minutes) and swept periodically below.
const jobs = new Map();

function makeJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Remove jobs nobody ever downloaded, so memory doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutes
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 5 * 60 * 1000).unref();

// Search invoices by invoice number, customer name, GST/Non-GST, and date range
exports.searchInvoices = async (req, res) => {
  try {
    const { invoiceNumber, customerName, gstFilter, fromDate, toDate } = req.body;

    let whereClause = " WHERE fs.isActive = 1 ";
    const params = [];

    if (invoiceNumber) {
      whereClause += " AND fs.invoiceNumber LIKE ? ";
      params.push(`%${invoiceNumber}%`);
    }

    if (gstFilter === "gst") {
      whereClause += " AND fs.isGstBilling = 1 ";
    } else if (gstFilter === "non-gst") {
      whereClause += " AND (fs.isGstBilling = 0 OR fs.isGstBilling IS NULL) ";
    }

    if (fromDate && toDate) {
      whereClause += " AND DATE(fs.DateofTransaction) BETWEEN ? AND ? ";
      params.push(fromDate, toDate);
    }

    if (customerName) {
      whereClause += " AND c.Name LIKE ? ";
      params.push(`%${customerName}%`);
    }

    const [rows] = await pool.query(
      `SELECT
         fs.id,
         fs.sale_tracking_Id,
         fs.invoiceNumber,
         fs.TotalAmount,
         fs.AmountPaid,
         fs.DateofTransaction,
         fs.isGstBilling,
         fs.UserId,
         (SELECT sale_type FROM sales WHERE sale_tracking_id = fs.sale_tracking_Id LIMIT 1) AS sale_type,
         c.Name AS customer_name,
         u.name AS staff_name
       FROM final_sale fs
       LEFT JOIN Customers c ON c.id = fs.UserId
       LEFT JOIN users u ON u.user_id = fs.UserId
       ${whereClause}
       ORDER BY fs.DateofTransaction DESC
       LIMIT 500`,
      params
    );

    const results = rows.map((r) => ({
      ...r,
      display_name:
        r.sale_type === "marketing"
          ? `${r.staff_name || "Unknown Staff"} (Route Staff)`
          : r.customer_name || "N/A",
    }));

    res.json(results);
  } catch (error) {
    console.error("Error in searchInvoices:", error);
    res.status(500).json({ error: "Database error" });
  }
};

const INVOICE_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 24px; }
  .invoice-card { }
  .invoice-card + .invoice-card { page-break-before: always; }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 3px 0; color: #475569; }
  .invoice-title { text-align: center; font-size: 15px; font-weight: bold; margin: 14px 0; }
  .details { display: flex; justify-content: space-between; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; }
  .details div { font-size: 11px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10.5px; }
  th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 9.5px; }
  td.num, th.num { text-align: right; }
  td.center, th.center { text-align: center; }
  .total-row { font-weight: bold; background: #f1f5f9; }
  .product-gst td { font-size: 9.5px; color: #64748b; border-top: none; background: #fafafa; padding: 2px 8px 6px; }
  .totals { margin-top: 12px; display: flex; flex-direction: column; align-items: flex-end; }
  .totals table { width: 320px; margin-top: 0; }
  .totals td { border: none; padding: 3px 4px; font-size: 11px; }
  .totals tr.grand-total td { border-top: 2px solid #0f172a; font-size: 13px; font-weight: 800; padding-top: 6px; }
  .amount-words { width: 320px; margin-top: 4px; padding-top: 6px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #475569; text-align: right; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
`;

function wrapHtmlDocument(bodyContent) {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${INVOICE_STYLES}</style>
      </head>
      <body>${bodyContent}</body>
    </html>
  `;
}

// Build just the invoice content (no <html>/<head> wrapper) for one
// sale_tracking_id, plus its invoice number for naming. Returns null if the
// invoice can't be found.
async function buildInvoiceFragment(saleTrackingId) {
  const [finalSaleRows] = await pool.query(
    `SELECT
       fs.invoiceNumber, fs.TotalAmount, fs.AmountPaid, fs.DateofTransaction,
       fs.isGstBilling, fs.UserId,
       c.Name AS customer_name, c.Place AS customer_place, c.Mobile AS customer_mobile, c.GstNumber AS customer_gst
     FROM final_sale fs
     LEFT JOIN Customers c ON c.id = fs.UserId
     WHERE fs.sale_tracking_Id = ? AND fs.isActive = 1`,
    [saleTrackingId]
  );

  if (finalSaleRows.length === 0) return null;
  const invoice = finalSaleRows[0];

  const [items] = await pool.query(
    `SELECT s.quantity_sold, s.amount_received, s.sale_type, s.damaged_count, s.marketing_staff_id,
            p.product_name, p.mrp, COALESCE(NULLIF(TRIM(p.hsn_code), ''), '') AS hsn_code,
            pp.cgst_percentage, pp.sgst_percentage,
            u.name AS staff_name
     FROM sales s
     JOIN products p ON p.product_id = s.product_id
     JOIN product_prices pp ON pp.price_id = s.price_id
     LEFT JOIN users u ON u.user_id = s.marketing_staff_id
     WHERE s.sale_tracking_id = ? AND s.isActive = 1`,
    [saleTrackingId]
  );

  const isMarketing = items.length > 0 && items[0].sale_type === "marketing";
  const staffName = isMarketing ? items[0].staff_name : null;
  // Marketing/route-staff sales never carry GST/HSN data - same rule as the
  // shared marketingSaleReceiptPrint.js / directSaleReceiptPrint.js printers.
  const isGst = !isMarketing && Number(invoice.isGstBilling) === 1;

  let totalAmt = 0;
  let totalTaxableAmt = 0;
  let totalCgst = 0;
  let totalSgst = 0;

  const rows = items
    .filter((item) => parseFloat(item.quantity_sold) > 0)
    .map((item, index) => {
      const quantity = parseFloat(item.quantity_sold) || 0;
      const damagedCount = parseFloat(item.damaged_count) || 0;
      const soldQty = quantity - damagedCount;
      const sellingPrice = soldQty > 0 ? parseFloat(item.amount_received) / soldQty : 0;
      const amount = sellingPrice * soldQty;

      if (isGst) {
        const gst = parseFloat(item.cgst_percentage || 0) + parseFloat(item.sgst_percentage || 0);
        const taxableValue = amount / (1 + gst / 100);
        const cgstAmount = taxableValue * (parseFloat(item.cgst_percentage || 0) / 100);
        const sgstAmount = taxableValue * (parseFloat(item.sgst_percentage || 0) / 100);

        totalCgst += cgstAmount;
        totalSgst += sgstAmount;
        totalTaxableAmt += taxableValue;
        totalAmt += amount;

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${item.product_name}</td>
            <td class="center">${item.hsn_code || ""}</td>
            <td class="center">${gst}%</td>
            <td class="num">${item.mrp ?? "N/A"}</td>
            <td class="num">Rs. ${sellingPrice.toFixed(2)}</td>
            <td class="center">${quantity}</td>
            <td class="num">Rs. ${(cgstAmount + sgstAmount).toFixed(2)}</td>
            <td class="num">Rs. ${taxableValue.toFixed(2)}</td>
            <td class="num">Rs. ${amount.toFixed(2)}</td>
          </tr>
          <tr class="product-gst">
            <td colspan="10">CGST: Rs. ${cgstAmount.toFixed(2)} &nbsp;|&nbsp; SGST: Rs. ${sgstAmount.toFixed(2)}</td>
          </tr>`;
      }

      totalAmt += amount;
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.product_name}</td>
          <td class="num">${quantity}</td>
          <td class="num">Rs. ${amount.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  const totalsRows = isGst
    ? `
      <tr><td>Taxable Amount</td><td class="num">Rs. ${totalTaxableAmt.toFixed(2)}</td></tr>
      <tr><td>Total CGST</td><td class="num">Rs. ${totalCgst.toFixed(2)}</td></tr>
      <tr><td>Total SGST</td><td class="num">Rs. ${totalSgst.toFixed(2)}</td></tr>
      <tr><td>Total Tax</td><td class="num">Rs. ${(totalCgst + totalSgst).toFixed(2)}</td></tr>
      <tr class="grand-total"><td>Total Amount</td><td class="num">Rs. ${totalAmt.toFixed(2)}</td></tr>
      <tr><td>Amount Paid</td><td class="num">Rs. ${Number(invoice.AmountPaid || 0).toFixed(2)}</td></tr>
    `
    : `
      <tr class="grand-total"><td>Total Amount</td><td class="num">Rs. ${totalAmt.toFixed(2)}</td></tr>
      <tr><td>Amount Paid</td><td class="num">Rs. ${Number(invoice.AmountPaid || 0).toFixed(2)}</td></tr>
    `;

  const fragment = `
    <div class="invoice-card">
      <div class="header">
        <h1>${headerInfo.agencyName}</h1>
        <p>${headerInfo.address}</p>
        <p>${headerInfo.phone}</p>
        ${isGst ? `<p>GSTIN: ${headerInfo.gstNumber}</p>` : ""}
      </div>
      <div class="invoice-title">${isGst ? "TAX INVOICE" : "INVOICE"} - ${invoice.invoiceNumber}</div>
      <div class="details">
        <div>
          <strong>Bill To:</strong><br/>
          ${isMarketing ? `${staffName || "Route Staff"} (Marketing Route)` : (invoice.customer_name || "N/A")}<br/>
          ${!isMarketing && invoice.customer_place ? invoice.customer_place + "<br/>" : ""}
          ${!isMarketing && invoice.customer_mobile ? invoice.customer_mobile + "<br/>" : ""}
          ${isGst ? "Customer GSTIN: " + (invoice.customer_gst || "N/A") : ""}
        </div>
        <div style="text-align:right;">
          <strong>Date:</strong> ${new Date(invoice.DateofTransaction).toLocaleDateString("en-IN")}<br/>
          <strong>Invoice No:</strong> ${invoice.invoiceNumber}<br/>
          <strong>Billing Type:</strong> ${isGst ? "GST" : "Non-GST"}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            ${isGst ? `<th class="center">HSN Code</th><th class="center">GST %</th><th class="num">MRP</th><th class="num">Selling Price</th><th class="center">Quantity</th><th class="num">Tax</th><th class="num">Taxable Amount</th><th class="num">Total Amount</th>` : `<th class="num">Qty</th><th class="num">Amount</th>`}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="totals">
        <table>
          ${totalsRows}
        </table>
        <div class="amount-words"><strong>Amount in Words:</strong> ${amountToWords(totalAmt)}</div>
      </div>
      <div class="footer">${headerInfo.agencyName} - ${headerInfo.address}</div>
    </div>
  `;

  return { fragment, invoiceNumber: invoice.invoiceNumber };
}

const PDF_OPTIONS = {
  format: "A4",
  printBackground: true,
  margin: { top: "15mm", bottom: "15mm", left: "10mm", right: "10mm" },
};

async function processBulkDownload(jobId, saleTrackingIds, mode) {
  const job = jobs.get(jobId);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    if (mode === "combined") {
      const fragments = [];
      for (const trackingId of saleTrackingIds) {
        const result = await buildInvoiceFragment(trackingId);
        if (result) fragments.push(result.fragment);
        job.completed += 1;
      }

      await page.setContent(wrapHtmlDocument(fragments.join("")), { waitUntil: "domcontentloaded" });
      const pdfBuffer = await page.pdf(PDF_OPTIONS);

      job.buffer = Buffer.from(pdfBuffer);
      job.filename = `invoices_combined_${Date.now()}.pdf`;
      job.contentType = "application/pdf";
    } else {
      const chunks = [];
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const archiveDone = new Promise((resolve, reject) => {
        archive.on("data", (chunk) => chunks.push(chunk));
        archive.on("end", resolve);
        archive.on("error", reject);
      });

      for (const trackingId of saleTrackingIds) {
        const result = await buildInvoiceFragment(trackingId);
        if (result) {
          await page.setContent(wrapHtmlDocument(result.fragment), { waitUntil: "domcontentloaded" });
          const pdfBuffer = await page.pdf(PDF_OPTIONS);
          const safeName = (result.invoiceNumber || trackingId).replace(/\//g, "-");
          archive.append(Buffer.from(pdfBuffer), { name: `${safeName}.pdf` });
        }
        job.completed += 1;
      }

      archive.finalize();
      await archiveDone;

      job.buffer = Buffer.concat(chunks);
      job.filename = `invoices_${Date.now()}.zip`;
      job.contentType = "application/zip";
    }

    await page.close();
    await browser.close();
    job.status = "done";
  } catch (error) {
    if (browser) await browser.close();
    console.error("Error in processBulkDownload:", error);
    job.status = "error";
    job.errorMessage = error.message;
  }
}

// Kick off a background job and return its id immediately, so the frontend
// can poll progress instead of waiting on one long request with no feedback.
exports.startBulkDownload = async (req, res) => {
  const { saleTrackingIds, mode } = req.body;

  if (!Array.isArray(saleTrackingIds) || saleTrackingIds.length === 0) {
    return res.status(400).json({ error: "saleTrackingIds must be a non-empty array" });
  }

  const jobId = makeJobId();
  jobs.set(jobId, {
    status: "processing",
    total: saleTrackingIds.length,
    completed: 0,
    createdAt: Date.now(),
  });

  res.json({ jobId, total: saleTrackingIds.length });

  // Fire-and-forget; progress/result are polled separately.
  processBulkDownload(jobId, saleTrackingIds, mode === "combined" ? "combined" : "zip");
};

exports.getBulkDownloadStatus = (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({
    status: job.status,
    total: job.total,
    completed: job.completed,
    errorMessage: job.errorMessage,
  });
};

exports.getBulkDownloadResult = (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.status === "error") return res.status(500).json({ error: job.errorMessage || "Job failed" });
  if (job.status !== "done") return res.status(425).json({ error: "Job not ready yet" });

  res.setHeader("Content-Type", job.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${job.filename}"`);
  res.send(job.buffer);
  jobs.delete(jobId);
};
