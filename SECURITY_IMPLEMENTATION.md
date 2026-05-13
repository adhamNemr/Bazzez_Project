# 🛡️ Vortex POS - Advanced Security & Audit Implementation Report (V2)

This document contains the final source code for the security layer, including global XSS protection, high-performance rate limiting, and financial auditing snapshots.

## 1. Global XSS Protection (Sanitization)
Automatically cleans all incoming request data (body, query, params) to prevent script injection.

```javascript
// server/middleware/sanitize.js
const sanitizeInput = (req, res, next) => {
    const sanitizeValue = (val) => {
        if (typeof val !== 'string') return val;
        return val.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim();
    };
    const sanitizeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'object' ? sanitizeObject(v) : sanitizeValue(v)]));
    };
    req.body = sanitizeObject(req.body); req.query = sanitizeObject(req.query); req.params = sanitizeObject(req.params);
    next();
};
```

## 2. Optimized Rate Limiting (UPSERT Pattern)
Uses a single atomic database query for high performance and race-condition prevention.

```javascript
// server/middleware/rateLimiter.js
const query = `
    INSERT INTO rate_limit_logs ("key", "windowStart", "count", "createdAt", "updatedAt")
    VALUES (:key, :windowStart, 1, NOW(), NOW())
    ON CONFLICT ("key", "windowStart") 
    DO UPDATE SET "count" = rate_limit_logs."count" + 1, "updatedAt" = NOW()
    RETURNING "count";
`;
```

## 3. Financial-Grade Audit Logging
Detects critical tables (transactions, balances) and stores full snapshots + absolute values in a `JSONB` meta column for non-repudiation.

```javascript
// server/utils/auditLogger.js
const FINANCIAL_TABLES = ['merchant_transactions', 'merchant_balances', 'expenses', 'order_payments', 'orders'];
const isFinancial = FINANCIAL_TABLES.includes(tableName);
const meta = { 
    snapshot: isFinancial,
    balance_before: oldValues?.balance ?? null,
    balance_after: newValues?.balance ?? null
};
await AuditLog.create({ ..., oldValues, newValues, meta });
```

## 4. Security Middleware Order
Implemented in `server.js` for maximum protection:
1.  **Helmet:** Secure HTTP Headers.
2.  **BodyParser (10kb limit):** Prevents payload-size attacks.
3.  **SanitizeInput:** Global XSS cleaning.
4.  **RateLimiter:** API protection.
5.  **Auth/Authorize:** Identity & Access control.
