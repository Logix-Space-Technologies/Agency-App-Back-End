const pool = require("../config/db");
const puppeteer = require("puppeteer");
const { ZipArchive } = require("archiver");
// Kept in sync manually with src/components/headerInfo.js on the frontend
const headerInfo = {
  agencyName: "Sree Kailasam Agencies",
  address: "Mamood, Erumakuzhy , Nooranad PO, Alappuzha 690504",
  phone: " 9447608738 , 9847154715 , 0479-2387042 ",
};

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

// Build the invoice HTML for a single sale_tracking_id
async function buildInvoiceHtml(saleTrackingId) {
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
    `SELECT s.quantity_sold, s.amount_received, s.sale_type, p.product_name, s.marketing_staff_id, u.name AS staff_name
     FROM sales s
     JOIN products p ON p.product_id = s.product_id
     LEFT JOIN users u ON u.user_id = s.marketing_staff_id
     WHERE s.sale_tracking_id = ? AND s.isActive = 1`,
    [saleTrackingId]
  );

  const isMarketing = items.length > 0 && items[0].sale_type === "marketing";
  const staffName = isMarketing ? items[0].staff_name : null;

  const rows = items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.product_name}</td>
          <td class="num">${item.quantity_sold}</td>
          <td class="num">₹${Number(item.amount_received || 0).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 24px; }
          .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 20px; }
          .header p { margin: 3px 0; color: #475569; }
          .invoice-title { text-align: center; font-size: 15px; font-weight: bold; margin: 14px 0; }
          .details { display: flex; justify-content: space-between; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; }
          .details div { font-size: 11px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; }
          td.num, th.num { text-align: right; }
          .total-row { font-weight: bold; background: #f1f5f9; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${headerInfo.agencyName}</h1>
          <p>${headerInfo.address}</p>
          <p>${headerInfo.phone}</p>
        </div>
        <div class="invoice-title">${invoice.isGstBilling ? "TAX INVOICE" : "INVOICE"} - ${invoice.invoiceNumber}</div>
        <div class="details">
          <div>
            <strong>Bill To:</strong><br/>
            ${isMarketing ? `${staffName || "Route Staff"} (Marketing Route)` : (invoice.customer_name || "N/A")}<br/>
            ${!isMarketing && invoice.customer_place ? invoice.customer_place + "<br/>" : ""}
            ${!isMarketing && invoice.customer_mobile ? invoice.customer_mobile + "<br/>" : ""}
            ${!isMarketing && invoice.customer_gst ? "GSTIN: " + invoice.customer_gst : ""}
          </div>
          <div style="text-align:right;">
            <strong>Date:</strong> ${new Date(invoice.DateofTransaction).toLocaleDateString("en-IN")}<br/>
            <strong>Invoice No:</strong> ${invoice.invoiceNumber}<br/>
            <strong>Billing Type:</strong> ${invoice.isGstBilling ? "GST" : "Non-GST"}
          </div>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>Product</th><th class="num">Qty</th><th class="num">Amount</th></tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="3">Total</td>
              <td class="num">₹${Number(invoice.TotalAmount || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3">Amount Paid</td>
              <td class="num">₹${Number(invoice.AmountPaid || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">${headerInfo.agencyName} - ${headerInfo.address}</div>
      </body>
    </html>
  `;
}

// Generate a ZIP of PDFs for the given list of sale_tracking_ids
exports.downloadInvoicesZip = async (req, res) => {
  const { saleTrackingIds } = req.body;

  if (!Array.isArray(saleTrackingIds) || saleTrackingIds.length === 0) {
    return res.status(400).json({ error: "saleTrackingIds must be a non-empty array" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="invoices.zip"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(res);

    const page = await browser.newPage();

    for (const trackingId of saleTrackingIds) {
      const html = await buildInvoiceHtml(trackingId);
      if (!html) continue;

      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "15mm", bottom: "15mm", left: "10mm", right: "10mm" } });

      const [invRows] = await pool.query(
        `SELECT invoiceNumber FROM final_sale WHERE sale_tracking_Id = ? LIMIT 1`,
        [trackingId]
      );
      const invoiceNumber = invRows[0]?.invoiceNumber?.replace(/\//g, "-") || trackingId;

      archive.append(pdfBuffer, { name: `${invoiceNumber}.pdf` });
    }

    await page.close();
    await archive.finalize();
    await browser.close();
  } catch (error) {
    console.error("Error in downloadInvoicesZip:", error);
    if (browser) await browser.close();
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate invoices" });
    }
  }
};
