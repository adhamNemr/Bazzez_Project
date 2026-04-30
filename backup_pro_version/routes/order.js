const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.post("/", orderController.createOrder);
router.get("/active-tables", orderController.getActiveTables); // ✅ جلب الطاولات المشغولة
router.get("/table/:tableNumber", orderController.getOrderByTable); // ✅ جلب أوردر طاولة معينة

module.exports = router;