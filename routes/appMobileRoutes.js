const express = require("express");
const router = express.Router();
const { requireStaff } = require("../middleware/appAuth");
const c = require("../controllers/appMobileController");

router.post("/login", c.login);

router.use(requireStaff);
router.get("/me", c.me);
router.post("/logout", c.logout);
router.get("/routes", c.getRoutes);
router.get("/shops", c.getShops);
router.post("/shops", c.addShop);
router.put("/shops/:id", c.updateShop);
router.get("/shops/:id/history", c.getShopHistory);
router.get("/products", c.getProducts);
router.post("/invoices", c.createInvoice);
router.get("/invoices", c.getInvoices);
router.get("/invoices/:id", c.getInvoice);
router.get("/reports", c.getReport);
router.post("/log", c.postLog);

module.exports = router;
