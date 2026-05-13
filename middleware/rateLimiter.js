const { RateLimitLog } = require('../models');
const { Op } = require('sequelize');

/**
 * DB-Backed Rate Limiting Middleware
 * @param {Object} options - { windowMinutes, maxRequests, keyPrefix }
 */
const rateLimiter = (options = {}) => {
    const { 
        windowMinutes = 1, 
        maxRequests = 10, 
        keyPrefix = 'rl' 
    } = options;

    return async (req, res, next) => {
        try {
            const ip = req.ip || req.connection.remoteAddress;
            const key = `${keyPrefix}:${req.path}:${ip}`;
            
            // Align to the start of the current window (e.g., start of the minute)
            const now = new Date();
            const windowStart = new Date(Math.floor(now.getTime() / (windowMinutes * 60000)) * (windowMinutes * 60000));

            // Atomic increment or create
            const [record, created] = await RateLimitLog.findOrCreate({
                where: { key, windowStart },
                defaults: { count: 0 } // Start at 0
            });

            await record.increment('count', { by: 1 });
            await record.reload();

            if (record.count > maxRequests) {
                return res.status(429).json({ 
                    error: '⚠️ محاولات كثيرة جداً. يرجى الانتظار دقيقة قبل المحاولة مرة أخرى.' 
                });
            }

            // Cleanup old logs occasionally (e.g., 1% of requests)
            if (Math.random() < 0.01) {
                RateLimitLog.destroy({
                    where: {
                        windowStart: { [Op.lt]: new Date(now.getTime() - 10 * 60000) } // Clean logs older than 10 mins
                    }
                }).catch(err => console.error('RateLimit Cleanup Error:', err));
            }

            next();
        } catch (err) {
            console.error('Rate Limiter Error:', err);
            next(); // Proceed anyway if RL fails to not block users
        }
    };
};

module.exports = rateLimiter;
