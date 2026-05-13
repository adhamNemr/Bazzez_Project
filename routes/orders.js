const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");
const authorize = require('../middleware/authorize');
const { authMiddleware } = require('../middleware/authMiddleware'); // ✅ Added this
const { PERMISSIONS: P } = require('../config/permissions');

// 🛡️ Apply authMiddleware to all routes here to populate req.user
router.use(authMiddleware(['manager', 'supervisor', 'accountant', 'cashier', 'owner'])); 

router.get("/", authorize(P.orders.view), ordersController.fetchOrders); 
router.post("/count-sandwiches", authorize(P.reports.daily), ordersController.countSandwiches); 
router.post("/format-details", authorize(P.orders.view), ordersController.formatOrderDetails); 
router.put("/:orderId/cancel", authorize(P.orders.cancel), ordersController.cancelOrder); 
router.post("/:id/print", authorize(P.orders.view), ordersController.reprintOrder); 

module.exports = router;
