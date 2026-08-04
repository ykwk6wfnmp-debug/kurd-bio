'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const views = require('./views');
const { loadSession } = require('./lib/session');
const { ValidationError } = require('./lib/validation');
const { authRoutes } = require('./routes/auth');
const { profileRoutes } = require('./routes/profile');
const { adminRoutes } = require('./routes/admin');
const { pageRoutes } = require('./routes/pages');

function createApp(store) {
    const app = express();

    // Render/Railway put a proxy in front of us; needed for req.ip and req.protocol.
    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    app.use((req, res, next) => {
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('X-Frame-Options', 'SAMEORIGIN');
        res.set('Referrer-Policy', 'same-origin');
        next();
    });

    // Same-origin only unless CORS_ORIGIN explicitly names other origins.
    if (config.corsOrigins.length) {
        app.use(cors({ origin: config.corsOrigins, credentials: true, methods: ['GET', 'POST'] }));
    }

    app.use(express.json({ limit: config.jsonBodyLimit }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', index: false }));

    /**
     * Nothing dynamic may be cached.
     *
     * These responses carried no Cache-Control at all, only an ETag, which
     * leaves them open to heuristic caching by browsers and intermediary
     * proxies — mobile carriers especially. That can hide a brand new signup
     * from the admin list, and would let a cached dashboard survive a logout
     * on a shared phone. Static assets are served above and keep their 1h.
     *
     * Individual routes may still opt in to caching afterwards; the immutable
     * theme catalog does exactly that.
     */
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store, must-revalidate');
        next();
    });

    app.use(loadSession(store));

    app.use('/api', authRoutes(store));
    app.use('/api', profileRoutes(store));
    app.use('/api/admin', adminRoutes(store));
    app.use('/', pageRoutes(store));

    app.use((req, res) => {
        if (req.originalUrl.startsWith('/api/')) {
            return res.status(404).json({ success: false, message: 'ئەم داواکارییە بوونی نییە.' });
        }
        res.status(404).type('html').send(views.notFoundPage());
    });

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (err && err.type === 'entity.too.large') {
            return res.status(413).json({ success: false, message: 'قەبارەی داواکاریەکە زۆر گەورەیە.' });
        }
        console.error('[error]', err && err.stack ? err.stack : err);
        if (req.originalUrl.startsWith('/api/')) {
            return res.status(500).json({ success: false, message: 'هەڵەیەکی ناوخۆیی ڕوویدا.' });
        }
        res.status(500).type('html').send(views.notFoundPage());
    });

    return app;
}

module.exports = { createApp };
