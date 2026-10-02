const pool = require("../config/db");
const puppeteer = require("puppeteer");
const { reconstructDailyStock } = require("../utils/reconstructStock");

// Kept in sync manually with src/components/headerInfo.js on the frontend
const headerInfo = {
  agencyName: "Sree Kailasam Agencies",
  address: "Mamood, Erumakuzhy , Nooranad PO, Alappuzha 690504",
  phone: " 9447608738 , 9847154715 , 0479-2387042 ",
  email: "sreekailasamagencies@gmail.com",
};

const REPORT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 24px; }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 3px 0; color: #475569; }
  .report-title { text-align: center; font-size: 15px; font-weight: bold; margin: 14px 0 4px; }
  .report-meta { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10.5px; }
  th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 9px; }
  td.num, th.num { text-align: right; }
  td.center, th.center { text-align: center; }
  thead { display: table-header-group; }
  .product-card { }
  .product-card + .product-card { page-break-before: always; }
  .product-title { font-size: 14px; font-weight: bold; margin: 0 0 4px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #475569; margin: 14px 0 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
  .stat-row { display: flex; gap: 12px; margin-bottom: 6px; }
  .stat-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; text-align: center; }
  .stat-box .label { font-size: 9px; text-transform: uppercase; color: #64748b; }
  .stat-box .value { font-size: 16px; font-weight: bold; color: #0f172a; }
  .pill { display: inline-block; font-size: 9.5px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 2px 8px; margin: 2px; background: #f8fafc; color: #475569; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
`;

function wrapHtmlDocument(bodyContent) {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${REPORT_STYLES}</style>
      </head>
      <body>${bodyContent}</body>
    </html>
  `;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

function buildSummaryReportHtml(date, rows) {
  const tableRows = rows
    .map(
      (r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.product_name}</td>
          <td class="num">${r.opening_stock}</td>
          <td class="num">${r.purchase_qty + r.replacement_purchase_qty}</td>
          <td class="num">${r.sold_qty}</td>
          <td class="num">${r.damage_qty}</td>
          <td class="num">${r.misc_damage_qty}</td>
          <td class="num">${r.returned_qty - r.damaged_replacement_qty}</td>
          <td class="num"><b>${r.closing_stock}</b></td>
        </tr>`
    )
    .join("");

  return wrapHtmlDocument(`
    <div class="header">
      <h1>${headerInfo.agencyName}</h1>
      <p>${headerInfo.address}</p>
      <p>${headerInfo.phone}</p>
    </div>
    <div class="report-title">Daily Stock Audit - Summary</div>
    <div class="report-meta">Date: ${formatDate(date)} &nbsp;|&nbsp; Products: ${rows.length}</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Product</th>
          <th class="num">Opening</th>
          <th class="num">Purchases</th>
          <th class="num">Sales</th>
          <th class="num">Damage</th>
          <th class="num">Misc Damage</th>
          <th class="num">Returns (Net)</th>
          <th class="num">Closing</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer">${headerInfo.agencyName} - ${headerInfo.address}</div>
  `);
}

function buildDetailedReportHtml(date, rows, allocationsByProduct) {
  const cards = rows
    .map((r) => {
      const allocations = allocationsByProduct[r.product_id] || [];
      const allocationTotal = allocations.reduce((sum, a) => sum + Number(a.allocated_quantity || 0), 0);

      const allocationRows = allocations
        .map(
          (a, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${a.staff_name || `User #${a.marketing_staff_id}`}</td>
              <td>${a.date ? formatDate(String(a.date).slice(0, 10)) : "N/A"}</td>
              <td class="num">${a.allocated_quantity}</td>
            </tr>`
        )
        .join("");

      return `
        <div class="product-card">
          <p class="product-title">${r.product_name}</p>

          <div class="stat-row">
            <div class="stat-box">
              <div class="label">Opening Stock</div>
              <div class="value">${r.opening_stock}</div>
            </div>
            <div class="stat-box">
              <div class="label">Closing Stock</div>
              <div class="value">${r.closing_stock}</div>
            </div>
          </div>

          <div class="section-title">Additions</div>
          <span class="pill">Purchases Received: ${r.purchase_qty}</span>
          ${r.replacement_purchase_qty > 0 ? `<span class="pill">Supplier Replacements: ${r.replacement_purchase_qty}</span>` : ""}
          ${r.returned_qty > 0 ? `<span class="pill">Customer Returns (Good): ${r.returned_qty}</span>` : ""}

          <div class="section-title">Deductions</div>
          <span class="pill">Sales: ${r.sold_qty}</span>
          <span class="pill">Damage (at Settlement): ${r.damage_qty}</span>
          <span class="pill">Misc. Damage: ${r.misc_damage_qty}</span>
          ${r.damaged_replacement_qty > 0 ? `<span class="pill">Returns - Damaged, Replaced: ${r.damaged_replacement_qty}</span>` : ""}

          ${
            r.damaged_purchase_qty > 0 || r.damaged_refund_qty > 0 || r.loss_qty > 0
              ? `<div class="section-title">Tracked, No Effect on Stock</div>
                 ${r.damaged_purchase_qty > 0 ? `<span class="pill">Damaged Purchases: ${r.damaged_purchase_qty}</span>` : ""}
                 ${r.damaged_refund_qty > 0 ? `<span class="pill">Returns - Damaged, Refunded: ${r.damaged_refund_qty}</span>` : ""}
                 ${r.loss_qty > 0 ? `<span class="pill">Loss at Settlement: ${r.loss_qty}</span>` : ""}`
              : ""
          }

          ${
            allocations.length > 0
              ? `<div class="section-title">Outstanding Staff Allocation (Total: ${allocationTotal})</div>
                 <table>
                   <thead>
                     <tr><th>#</th><th>Staff / Account</th><th>Date Allocated</th><th class="num">Quantity</th></tr>
                   </thead>
                   <tbody>${allocationRows}</tbody>
                 </table>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  return wrapHtmlDocument(`
    <div class="header">
      <h1>${headerInfo.agencyName}</h1>
      <p>${headerInfo.address}</p>
      <p>${headerInfo.phone}</p>
    </div>
    <div class="report-title">Daily Stock Audit - Detailed</div>
    <div class="report-meta">Date: ${formatDate(date)} &nbsp;|&nbsp; Products: ${rows.length}</div>
    ${cards}
  `);
}

const PDF_OPTIONS = {
  format: "A4",
  printBackground: true,
  margin: { top: "15mm", bottom: "15mm", left: "10mm", right: "10mm" },
};

// Launching a fresh Chromium process per request (the previous approach) is
// the actual cause of most "Failed to generate the report" errors, even for
// a single, tiny product: a cold Chromium launch is the slowest and most
// memory-hungry step by far on a small EC2 instance, and it's paid on every
// single request regardless of report size. Keeping one browser alive and
// reusing it (a new tab per request, not a new process) cuts report
// generation from several seconds to well under one, and removes the
// crash-prone launch step from the hot path entirely.
let sharedBrowserPromise = null;
let idleCloseTimer = null;

// The EC2 box this runs on has only 1GB of RAM total, shared with the Node
// process itself. A resident Chromium process costs roughly 100-200MB even
// sitting idle, which is too much to hold onto permanently on a box this
// small - it would quietly starve the rest of the app of memory between
// reports instead of just this feature. So the browser is kept warm for a
// few minutes after each use (to make back-to-back summary+detailed
// downloads fast) and then closed automatically if nothing asks for it
// again; the next request after that just pays one cold-launch again.
const IDLE_CLOSE_MS = 5 * 60 * 1000;

function scheduleIdleClose() {
  if (idleCloseTimer) clearTimeout(idleCloseTimer);
  idleCloseTimer = setTimeout(() => {
    console.log("[stockAudit] closing idle shared browser to free memory");
    closeSharedBrowser();
  }, IDLE_CLOSE_MS);
  idleCloseTimer.unref();
}

async function getBrowser() {
  if (sharedBrowserPromise) {
    const existing = await sharedBrowserPromise.catch(() => null);
    if (existing && existing.connected) {
      scheduleIdleClose();
      return existing;
    }
    sharedBrowserPromise = null;
  }

  sharedBrowserPromise = puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // Chrome uses /dev/shm heavily when rendering (especially for a large
      // multi-page document like a 368-product detailed report), and EC2's
      // default /dev/shm is tiny (64MB) - once it fills up, Chrome crashes
      // mid-render with a printToPDF protocol error instead of a normal
      // timeout. This makes it spill to disk (/tmp) instead.
      "--disable-dev-shm-usage",
      // The rest trim Chromium's baseline memory/CPU footprint - none of
      // these features (GPU compositing, extensions, sync, translate,
      // audio, background network chatter) are used for rendering a static
      // HTML table to PDF, so there's no reason to pay for them on a 1GB box.
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-first-run",
      "--js-flags=--max-old-space-size=128",
    ],
    timeout: 120000,
  });

  const browser = await sharedBrowserPromise;
  browser.on("disconnected", () => {
    console.log("[stockAudit] shared browser disconnected, will relaunch on next request");
    sharedBrowserPromise = null;
  });
  scheduleIdleClose();
  return browser;
}

// Without this, a pm2 restart/redeploy kills the Node process but can leave
// the Chromium child process running as an orphan, permanently wasting
// memory on a box that's already tight on it.
async function closeSharedBrowser() {
  if (idleCloseTimer) {
    clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }
  if (!sharedBrowserPromise) return;
  const browser = await sharedBrowserPromise.catch(() => null);
  sharedBrowserPromise = null;
  if (browser) await browser.close().catch(() => {});
}
process.on("SIGINT", closeSharedBrowser);
process.on("SIGTERM", closeSharedBrowser);

exports.generateDailyStockAuditReport = async (req, res) => {
  let page;
  try {
    const { date, productIds, reportType, nonZeroOnly } = req.body;

    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const idsFilter = Array.isArray(productIds) && productIds.length > 0 ? productIds : null;
    let { data: rows } = await reconstructDailyStock(pool, idsFilter, date, date);

    if (nonZeroOnly) {
      rows = rows.filter((r) => r.closing_stock > 0);
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: "No products found for the given selection" });
    }

    rows.sort((a, b) => (a.product_name < b.product_name ? -1 : a.product_name > b.product_name ? 1 : 0));

    const isDetailed = reportType === "detailed";
    let allocationsByProduct = {};

    if (isDetailed) {
      const productIdList = rows.map((r) => r.product_id);
      const [allocRows] = await pool.query(
        `SELECT dsa.product_id, dsa.daily_stock_id, dsa.marketing_staff_id, u.name AS staff_name, dsa.date, dsa.allocated_quantity
         FROM daily_stock_allocation dsa
         LEFT JOIN users u ON u.user_id = dsa.marketing_staff_id
         WHERE dsa.isActive = 1 AND dsa.converted_to_sales = 0 AND dsa.product_id IN (?)
         ORDER BY dsa.date DESC`,
        [productIdList]
      );
      for (const row of allocRows) {
        if (!allocationsByProduct[row.product_id]) allocationsByProduct[row.product_id] = [];
        allocationsByProduct[row.product_id].push(row);
      }
    }

    const html = isDetailed
      ? buildDetailedReportHtml(date, rows, allocationsByProduct)
      : buildSummaryReportHtml(date, rows);

    // Logged step-by-step so a future hang or crash shows exactly which
    // stage it's stuck in instead of a bare, unhelpful error.
    console.log(`[stockAudit] getting browser (${rows.length} products, ${reportType})`);
    const browser = await getBrowser();
    console.log("[stockAudit] opening page");
    page = await browser.newPage();
    // page.pdf()'s own options don't take a `timeout` key - a previous
    // attempt hit exactly 30000ms despite passing one, confirming that.
    // setDefaultTimeout() is what actually governs printToPDF's protocol
    // timeout.
    page.setDefaultTimeout(120000);
    console.log("[stockAudit] setting content");
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    console.log("[stockAudit] content set, rendering pdf");
    const pdfBuffer = await page.pdf(PDF_OPTIONS);
    console.log("[stockAudit] pdf rendered, closing page");
    await page.close();
    page = null;

    const filename = `daily-stock-audit-${isDetailed ? "detailed" : "summary"}-${date}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    if (page) await page.close().catch(() => {});
    console.error("Error generating daily stock audit report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
};
