const { ROLES } = require('../config/permissions');

/**
 * Authorization Middleware
 * Checks if the authenticated user's role has the required permissions.
 * @param {...string} requiredPermissions - One or more permission strings (e.g., 'orders:cancel')
 */
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        // req.user is populated by the authentication middleware (JWT)
        const userRole = req.user?.role;
        const roleConfig = ROLES[userRole];

        if (!roleConfig) {
            return res.status(403).json({ error: '⛔ دور غير معروف أو غير مصرح له بالوصول' });
        }

        // Check if the role has ALL the required permissions for this action
        const hasAllPermissions = requiredPermissions.every(permission =>
            roleConfig.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
            return res.status(403).json({ 
                error: '🚫 ليس لديك الصلاحية الكافية للقيام بهذا الإجراء',
                required: requiredPermissions
            });
        }

        next();
    };
};

module.exports = authorize;
