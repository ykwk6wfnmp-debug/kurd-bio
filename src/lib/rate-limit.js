'use strict';

/**
 * Small in-memory fixed-window rate limiter. Good enough for a single
 * instance; if the app is ever scaled horizontally this needs a shared store.
 */
function rateLimit({ windowMs, max, message, keyFn }) {
    const hits = new Map();

    // Drop expired buckets so the map cannot grow without bound.
    const sweeper = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, windowMs);
    if (sweeper.unref) sweeper.unref();

    return function rateLimitMiddleware(req, res, next) {
        const key = keyFn ? keyFn(req) : req.ip;
        const now = Date.now();
        let entry = hits.get(key);

        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }

        entry.count += 1;
        if (entry.count > max) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            // Logged because a rate-limited signup looks identical to a lost one
            // from the outside, and behind a proxy a misread client IP can put
            // every visitor into the same bucket.
            console.warn(`[rate-limit] BLOCKED ${req.method} ${req.originalUrl} for key "${key}" (retry in ${retryAfter}s)`);
            return res.status(429).json({ success: false, message });
        }
        next();
    };
}

module.exports = { rateLimit };
