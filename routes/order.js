const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { validate, orderSchema } = require("../middleware/validationMiddleware");

router.post("/", validate(orderSchema), orderController.createOrder);

module.exports = router;