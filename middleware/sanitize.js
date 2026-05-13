/**
 * 🛡️ Sanitize Input Middleware
 * Prevents XSS by escaping HTML special characters in req.body, req.query, and req.params.
 * Based on Claude's recommendation for global XSS protection.
 */

const sanitizeInput = (req, res, next) => {
    const sanitizeValue = (val) => {
        if (typeof val !== 'string') return val;
        return val
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/javascript:/gi, '')
            .trim();
    };

    const sanitizeObject = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
            return obj.map(item => (typeof item === 'object' ? sanitizeObject(item) : sanitizeValue(item)));
        }

        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [
                k,
                (typeof v === 'object' && v !== null) ? sanitizeObject(v) : sanitizeValue(v)
            ])
        );
    };

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    next();
};

module.exports = sanitizeInput;
