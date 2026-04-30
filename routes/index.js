// routes/index.js
const express = require("express");
const router = express.Router();
const authRoutes = require("./auth");
const productRoutes = require("./Products");
const saleRoutes = require("./sales");
const userRoutes = require("./users");
const paymentRoutes = require("./payments");
const {
  authMiddleware,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// ✅ Authentication API
router.use("/auth", authRoutes);

// ⚠️ Note: Root-level /products and /sales are now handled by pages.js for HTML.
// API calls should use the /api prefix defined in server.js.

// Extra API Logic if needed
router.use("/payments", authMiddleware(["manager", "cashier"]), paymentRoutes);

// Protected examples
router.get(
  "/protected-route",
  authMiddleware(["manager", "cashier"]),
  (req, res) => {
    res.json({ message: "🟢 دخول ناجح للصفحة المحمية!" });
  }
);

module.exports = router;
