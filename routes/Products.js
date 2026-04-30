const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { validate, productSchema } = require("../middleware/validationMiddleware");

// ✅ تأكد من استخدام الدوال بالشكل الصحيح
router.get('/:category', authMiddleware(['manager', 'cashier', 'admin']), productController.getProductsByCategory);

router.post('/add', authMiddleware(['manager', 'admin']), validate(productSchema), productController.addProduct);

router.get("/", authMiddleware(['manager', 'cashier', 'admin']), productController.getAllProducts);

router.get("/:id", authMiddleware(['manager', 'cashier', 'admin']), productController.getProductById);

router.put("/:id", authMiddleware(['manager', 'admin']), validate(productSchema), productController.updateProduct);

router.delete("/:id", authMiddleware(['manager', 'admin']), productController.deleteProduct);

module.exports = router;