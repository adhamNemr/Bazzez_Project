const jwt = require("jsonwebtoken");
require("dotenv").config();
const { TokenBlacklist } = require("../models");

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set!");
const secretKey = process.env.JWT_SECRET;

// ✅ Middleware للتحقق من التوكن وتحديد هوية المستخدم
const authMiddleware = (allowedRoles) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "يجب تسجيل الدخول للوصول إلى هذه الصفحة." });
  }

  try {
    // 🛡️ Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.findByPk(token);
    if (isBlacklisted) {
      console.log("🚫 Token is blacklisted");
      return res
        .status(401)
        .json({ message: "جلسة ملغاة. يرجى تسجيل الدخول مجدداً." });
    }

    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;

    // التحقق من الأدوار المسموح بها (إن وجدت)
    if (allowedRoles) {
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (!roles.includes(decoded.role)) {
        return res.status(403).json({
          message: "ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.",
        });
      }
    }

    next();
  } catch (err) {
    console.error("❌ Authentication Error:", err.message);
    return res.status(401).json({ message: "جلسة غير صالحة أو انتهت." });
  }
};

// 🚦 ميدلوير للتحقق من الصلاحيات (legacy/simple check)
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "❌ يجب تسجيل الدخول أولاً." });

    const userRole = req.user.role;
    if (userRole === "manager" || allowedRoles.includes(userRole)) {
      return next();
    }

    console.log(`🚫 الدور ${userRole} غير مصرح له.`);
    return res
      .status(403)
      .json({ error: "🚫 لا تملك الصلاحية للوصول إلى هذا المورد." });
  };
};

module.exports = { authMiddleware, authorizeRoles };
