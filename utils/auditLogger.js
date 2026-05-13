const { AuditLog } = require('../models');

/**
 * Log an action to the audit trail
 * @param {Object} req - Express request object (to get user/IP)
 * @param {Object} options - { action, tableName, recordId, oldValues, newValues }
 */
const logAudit = async (req, { action, tableName, recordId, oldValues, newValues }) => {
    try {
        // Only log differences for UPDATE
        let finalOld = oldValues;
        let finalNew = newValues;

        if (action === 'UPDATE' && oldValues && newValues) {
            finalOld = {};
            finalNew = {};
            
            // Capture only changed fields
            Object.keys(newValues).forEach(key => {
                if (JSON.stringify(newValues[key]) !== JSON.stringify(oldValues[key])) {
                    finalOld[key] = oldValues[key];
                    finalNew[key] = newValues[key];
                }
            });

            // If nothing changed, don't log (optional)
            if (Object.keys(finalNew).length === 0) return;
        }

        await AuditLog.create({
            userId: req.user?.id,
            userName: req.user?.username,
            action,
            tableName,
            recordId: String(recordId),
            oldValues: finalOld,
            newValues: finalNew,
            ipAddress: req.ip || req.connection.remoteAddress,
            endpoint: `${req.method} ${req.originalUrl}`
        });
    } catch (err) {
        console.error('⚠️ Audit Logging Failed:', err);
        // Don't throw, we don't want to break the main application flow
    }
};

module.exports = { logAudit };
