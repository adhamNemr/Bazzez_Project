# 🛡️ Vortex POS - Security & Audit Implementation Report

This document contains the source code for the new security layer, audit logging, and RBAC system implemented to ensure production readiness and data integrity.

## 1. Permissions Configuration
Defines granular permissions and maps them to user roles.

```javascript
// server/config/permissions.js
const PERMISSIONS = {
    orders: { create: 'orders:create', view: 'orders:view', cancel: 'orders:cancel', refund: 'orders:refund' },
    inventory: { view: 'inventory:view', edit: 'inventory:edit', delete: 'inventory:delete' },
    reports: { daily: 'reports:daily', monthly: 'reports:monthly', export: 'reports:export' },
    finance: { view: 'finance:view', edit: 'finance:edit', ledger: 'finance:ledger' },
    users: { manage: 'users:manage' },
};

const ROLES = {
    manager: { label: 'مدير', permissions: [...Object.values(PERMISSIONS.orders), ...Object.values(PERMISSIONS.inventory), ...Object.values(PERMISSIONS.reports), ...Object.values(PERMISSIONS.finance), ...Object.values(PERMISSIONS.users)] },
    supervisor: { label: 'مشرف', permissions: [PERMISSIONS.orders.create, PERMISSIONS.orders.view, PERMISSIONS.orders.cancel, PERMISSIONS.orders.refund, PERMISSIONS.inventory.view, PERMISSIONS.inventory.edit, PERMISSIONS.reports.daily, PERMISSIONS.finance.view] },
    accountant: { label: 'محاسب', permissions: [PERMISSIONS.orders.view, PERMISSIONS.reports.daily, PERMISSIONS.reports.monthly, PERMISSIONS.reports.export, PERMISSIONS.finance.view, PERMISSIONS.finance.edit, PERMISSIONS.finance.ledger] },
    cashier: { label: 'كاشير', permissions: [PERMISSIONS.orders.create, PERMISSIONS.orders.view, PERMISSIONS.inventory.view, PERMISSIONS.reports.daily] },
    owner: { label: 'مالك', permissions: [PERMISSIONS.orders.view, PERMISSIONS.reports.daily, PERMISSIONS.reports.monthly, PERMISSIONS.finance.view, PERMISSIONS.finance.ledger] },
};
module.exports = { PERMISSIONS, ROLES };
```

## 2. Authorization Middleware
Enforces role-based permissions on routes.

```javascript
// server/middleware/authorize.js
const { ROLES } = require('../config/permissions');
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        const userRole = req.user?.role;
        const roleConfig = ROLES[userRole];
        if (!roleConfig) return res.status(403).json({ error: '⛔ دور غير معروف' });
        const hasAll = requiredPermissions.every(p => roleConfig.permissions.includes(p));
        if (!hasAll) return res.status(403).json({ error: '🚫 ليس لديك الصلاحية الكافية' });
        next();
    };
};
module.exports = authorize;
```

## 3. Database-Backed Rate Limiting
Protects against brute-force attacks on sensitive endpoints.

```javascript
// server/middleware/rateLimiter.js
const { RateLimitLog } = require('../models');
const rateLimiter = (options = {}) => {
    const { windowMinutes = 1, maxRequests = 10, keyPrefix = 'rl' } = options;
    return async (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${keyPrefix}:${req.path}:${ip}`;
        const windowStart = new Date(Math.floor(Date.now() / (windowMinutes * 60000)) * (windowMinutes * 60000));
        const [record, created] = await RateLimitLog.findOrCreate({ where: { key, windowStart }, defaults: { count: 1 } });
        if (!created) {
            if (record.count >= maxRequests) return res.status(429).json({ error: '⚠️ محاولات كثيرة جداً. يرجى الانتظار.' });
            await record.increment('count', { by: 1 });
        }
        next();
    };
};
module.exports = rateLimiter;
```

## 4. Audit Logging Utility
Captures data changes (diffs) for accountability.

```javascript
// server/utils/auditLogger.js
const { AuditLog } = require('../models');
const logAudit = async (req, { action, tableName, recordId, oldValues, newValues }) => {
    let finalOld = oldValues, finalNew = newValues;
    if (action === 'UPDATE' && oldValues && newValues) {
        finalOld = {}; finalNew = {};
        Object.keys(newValues).forEach(key => {
            if (JSON.stringify(newValues[key]) !== JSON.stringify(oldValues[key])) {
                finalOld[key] = oldValues[key];
                finalNew[key] = newValues[key];
            }
        });
        if (Object.keys(finalNew).length === 0) return;
    }
    await AuditLog.create({
        userId: req.user?.id, userName: req.user?.username,
        action, tableName, recordId: String(recordId),
        oldValues: finalOld, newValues: finalNew,
        ipAddress: req.ip, endpoint: `${req.method} ${req.originalUrl}`
    });
};
module.exports = { logAudit };
```

## 5. Route Integration Example
How authentication and authorization are combined.

```javascript
// server/routes/merchants.js
router.use(authMiddleware(['manager', 'supervisor', 'accountant', 'cashier', 'owner']));
router.get('/', authorize(P.finance.view), merchantController.getMerchants);
router.post('/', authorize(P.finance.edit), merchantController.createMerchant);
router.delete('/:id', authorize(P.users.manage), merchantController.deleteMerchant);
```

## 6. Secure Logout (JWT Revocation)
Invalidates tokens by blacklisting them in the database.

```javascript
// server/controllers/authController.js
exports.logout = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.decode(token);
    await TokenBlacklist.create({
        token,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : new Date()
    });
    res.json({ success: true, message: "✅ تم تسجيل الخروج بنجاح." });
};
```
