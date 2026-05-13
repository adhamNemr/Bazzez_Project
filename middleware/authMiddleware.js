const jwt = require('jsonwebtoken');
require('dotenv').config();
const { TokenBlacklist } = require('../models');

const secretKey = process.env.JWT_SECRET || 'mySuperSecretKey123';

// ✅ Middleware للتحقق من صلاحية المستخدم بناءً على الدور المسموح
const authMiddleware = (allowedRoles) => async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة.' });
    }

    try {
        // 🛡️ Check if token is blacklisted
        const isBlacklisted = await TokenBlacklist.findByPk(token);
        if (isBlacklisted) {
            return res.status(401).json({ message: 'جلسة ملغاة. يرجى تسجيل الدخول مجدداً.' });
        }

        const decoded = jwt.verify(token, secretKey);
        req.user = decoded;
        
        // التحقق من الدور المسموح به
        if (allowedRoles && !allowedRoles.includes(decoded.role)) {
            return res.status(403).json({ message: 'ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.' });
        }

        next();
    } catch (err) {
        console.error('❌ Authentication Error:', err.message);
        return res.status(401).json({ message: 'جلسة غير صالحة أو انتهت.' });
    }
};

module.exports = { authMiddleware };

// 🚦 ميدلوير للتحقق من الصلاحيات
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: '❌ يجب تسجيل الدخول أولاً.' });
        }

        const userRole = req.user.role;

        // 👑 لو المستخدم مدير، يسمح له بكل شيء
        if (userRole === 'manager') {
            return next();
        }

        // ✅ التحقق من الأدوار المسموح بها
        if (allowedRoles.includes(userRole)) {
            return next();
        } else {
            console.log(`🚫 الدور ${userRole} غير مصرح له بالوصول إلى هذا المورد.`);
            return res.status(403).json({ error: '🚫 لا تملك الصلاحية للوصول إلى هذا المورد.' });
        }
    };
};

module.exports = { authMiddleware, authorizeRoles };
