const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  validate,
  productSchema,
} = require("../middleware/validationMiddleware");

// ✅ تأكد من استخدام الدوال بالشكل الصحيح
// ✅ المزامنة مع الفرونت إند: استخدام الـ root للـ POST والـ GET
router.get(
  "/",
  authMiddleware(["manager", "cashier", "admin"]),
  productController.getAllProducts,
);

router.get(
  "/item/:id",
  authMiddleware(["manager", "cashier", "admin"]),
  productController.getProductById,
);

router.get(
  "/:category",
  authMiddleware(["manager", "cashier", "admin"]),
  productController.getProductsByCategory,
);

router.post(
  "/",
  authMiddleware(["manager", "admin"]),
  validate(productSchema),
  productController.addProduct,
);

router.put(
  "/:id",
  authMiddleware(["manager", "admin"]),
  validate(productSchema),
  productController.updateProduct,
);

router.delete(
  "/:id",
  authMiddleware(["manager", "admin"]),
  productController.deleteProduct,
);

module.exports = router;
