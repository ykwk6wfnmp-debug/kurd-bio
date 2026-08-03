'use strict';

const express = require('express');
const views = require('../views');
const { requireAuth, requireAdmin } = require('../lib/session');
const { publicProfileUrl, profilePath } = require('../lib/urls');
const { USERNAME_RE } = require('../lib/validation');

function pageRoutes(store) {
    const router = express.Router();

    function html(res, body, status = 200) {
        res.status(status).type('html').send(body);
    }

    router.get('/', (req, res) => {
        if (req.user) return res.redirect(req.user.role === 'admin' ? '/admin' : '/dashboard');
        html(res, views.loginPage());
    });

    router.get('/dashboard', requireAuth, (req, res) => {
        html(
            res,
            views.dashboardPage({
                // The one place a share URL is ever built.
                shareUrl: publicProfileUrl(req, req.user.username),
                isAdmin: req.user.role === 'admin'
            })
        );
    });

    router.get('/editor', requireAuth, (req, res) => html(res, views.editorPage()));
    router.get('/themes', requireAuth, (req, res) => html(res, views.themesPage()));
    router.get('/settings', requireAuth, (req, res) => html(res, views.settingsPage()));
    router.get('/balance', requireAuth, (req, res) => html(res, views.balancePage()));
    router.get('/admin', requireAdmin, (req, res) => html(res, views.adminPage()));

    // Primary public URL.
    router.get('/u/:username', async (req, res, next) => {
        try {
            const username = String(req.params.username || '').toLowerCase();
            if (!USERNAME_RE.test(username)) return html(res, views.notFoundPage(), 404);

            const record = await store.getUser(username);
            if (!record || record.banned) return html(res, views.notFoundPage(), 404);

            html(res, views.profilePage({ username }));
        } catch (err) {
            next(err);
        }
    });

    // Legacy public URL, kept working for links already shared in the wild.
    router.get('/profile', (req, res) => {
        const username = String(req.query.user || '').toLowerCase();
        if (!USERNAME_RE.test(username)) return res.redirect('/');
        res.redirect(301, profilePath(username));
    });

    router.get('/health', (req, res) => res.json({ ok: true }));

    return router;
}

module.exports = { pageRoutes };
