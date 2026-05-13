const express = require("express");
const authController = require("../controllers/authController");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// 🛡️ Protect login with rate limiting (max 10 attempts per minute)
router.post("/login", rateLimiter({ maxRequests: 10, keyPrefix: 'login' }), authController.login);

router.post("/logout", authController.logout);

module.exports = router;
