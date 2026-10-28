const express = require("express");
const router = express.Router();
const c = require("../controllers/appAdminController");

router.post("/routes", c.listRoutes);
router.post("/routes/save", c.saveRoute);
router.post("/routes/delete", c.deleteRoute);

router.post("/staff", c.listStaff);
router.post("/staff/routes", c.setStaffRoutes);

router.post("/shops", c.listShops);
router.post("/shops/save", c.saveShop);
router.post("/shops/delete", c.deleteShop);

router.post("/logs", c.listLogs);
router.post("/logs/purge", c.purgeLogs);

router.post("/invoices", c.listInvoices);
router.post("/invoices/detail", c.invoiceDetail);
router.post("/invoices/products", c.invoiceProducts);
router.post("/invoices/update", c.updateInvoice);
router.post("/invoices/settle", c.settleInvoices);
router.post("/invoices/reject", c.rejectInvoice);

module.exports = router;
