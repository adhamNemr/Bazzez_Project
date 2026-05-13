const { AuditLog } = require('../models');

/**
 * 📝 Enhanced Audit Logger
 * Captures data changes (diffs) or full snapshots for financial tables.
 * Based on Claude's recommendation for robust financial auditing.
 */
const logAudit = async (req, { action, tableName, recordId, oldValues, newValues }) => {
    try {
        // Tables that require full snapshots instead of just diffs
        const FINANCIAL_TABLES = [
            'merchant_transactions', 
            'merchant_balances', 
            'expenses', 
            'order_payments',
            'orders' // Orders are also critical
        ];
        
        const isFinancial = FINANCIAL_TABLES.includes(tableName);
        let finalOld = oldValues;
        let finalNew = newValues;
        let meta = { snapshot: isFinancial };

        if (action === 'UPDATE' && !isFinancial) {
            // Diff logic for non-financial tables to save space
            finalOld = {};
            finalNew = {};
            
            const keys = Object.keys(newValues || {});
            keys.forEach(key => {
                if (JSON.stringify(newValues[key]) !== JSON.stringify(oldValues?.[key])) {
                    finalOld[key] = oldValues?.[key];
                    finalNew[key] = newValues[key];
                }
            });

            // If nothing changed, don't log anything
            if (Object.keys(finalNew).length === 0) return;
        }

        // Add specialized financial metadata if applicable
        if (isFinancial) {
            meta = {
                ...meta,
                balance_before: oldValues?.balance ?? oldValues?.current_balance ?? null,
                balance_after: newValues?.balance ?? newValues?.current_balance ?? null,
                amount: newValues?.amount ?? oldValues?.amount ?? null,
                currency: 'EGP' // Default
            };
        }

        await AuditLog.create({
            userId: req.user?.id,
            userName: req.user?.username,
            action,
            tableName,
            recordId: String(recordId),
            oldValues: finalOld,
            newValues: finalNew,
            meta,
            ipAddress: req.ip,
            endpoint: `${req.method} ${req.originalUrl}`
        });
    } catch (error) {
        console.error('❌ Audit Logging Error:', error);
        // Fail silent to not block main operation, but log error
    }
};

module.exports = { logAudit };
