const { sequelize } = require('../models');

/**
 * 🚦 Optimized Rate Limiter
 * Uses database UPSERT (ON CONFLICT) for maximum performance and atomicity.
 * Prevents race conditions and minimizes database round-trips.
 */
const rateLimiter = (options = {}) => {
    const { windowMinutes = 1, maxRequests = 10, keyPrefix = 'rl' } = options;

    return async (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${keyPrefix}:${req.path}:${ip}`;
        
        // Calculate the start of the current time window
        const windowStart = new Date(
            Math.floor(Date.now() / (windowMinutes * 60000)) * (windowMinutes * 60000)
        );

        try {
            /**
             * ⚡ UPSERT Pattern (PostgreSQL / SQLite compatible)
             * This single query handles both creation and incrementing.
             */
            const query = `
                INSERT INTO rate_limit_logs ("key", "windowStart", "count", "createdAt", "updatedAt")
                VALUES (:key, :windowStart, 1, NOW(), NOW())
                ON CONFLICT ("key", "windowStart") 
                DO UPDATE SET "count" = rate_limit_logs."count" + 1, "updatedAt" = NOW()
                RETURNING "count";
            `;

            const [results] = await sequelize.query(query, {
                replacements: { key, windowStart },
                type: sequelize.QueryTypes.SELECT
            });

            const currentCount = results?.count || 1;

            if (currentCount > maxRequests) {
                return res.status(429).json({
                    error: '⚠️ محاولات كثيرة جداً. يرجى الانتظار قليلاً.',
                    retryAfter: windowMinutes * 60
                });
            }

            // Optional: Periodic cleanup could be added here or via a cron job
            next();
        } catch (error) {
            console.error('❌ Rate Limiter Error:', error);
            // Fail open: If rate limiter fails, allow the request but log the error
            next();
        }
    };
};

module.exports = rateLimiter;
