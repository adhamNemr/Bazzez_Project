/**
 * 🚦 In-Memory Rate Limiter
 * Switched from Database to Memory to eliminate 'SQLITE_BUSY' errors.
 * Memory is preferred for transient data like rate limits in a POS environment.
 */
const memoryStore = new Map();

const rateLimiter = (options = {}) => {
    const { windowMinutes = 1, maxRequests = 100, keyPrefix = 'rl' } = options;

    // Cleanup memory every window period to prevent memory leaks
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of memoryStore.entries()) {
            if (now > record.resetTime) {
                memoryStore.delete(key);
            }
        }
    }, windowMinutes * 60000);

    return (req, res, next) => {
        if (process.env.NODE_ENV === 'test') return next();
        
        const ip = req.ip || req.connection.remoteAddress;
        const key = `${keyPrefix}:${req.path}:${ip}`;
        const now = Date.now();
        const windowMs = windowMinutes * 60000;

        let record = memoryStore.get(key);

        if (!record || now > record.resetTime) {
            // Create new record for new window
            record = {
                count: 1,
                resetTime: now + windowMs
            };
        } else {
            // Increment count in current window
            record.count += 1;
        }

        memoryStore.set(key, record);

        if (record.count > maxRequests) {
            return res.status(429).json({
                error: '⚠️ محاولات كثيرة جداً. يرجى الانتظار قليلاً.',
                retryAfter: Math.ceil((record.resetTime - now) / 1000)
            });
        }

        next();
    };
};

module.exports = rateLimiter;
