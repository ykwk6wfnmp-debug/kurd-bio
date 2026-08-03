'use strict';

const express = require('express');
const { requireAdmin } = require('../lib/session');

const MAX_CREDIT = 10000;

function adminRoutes(store) {
    const router = express.Router();
    router.use(requireAdmin);

    // Never leaks password hashes.
    function summarize(record) {
        return {
            username: record.username,
            role: record.role,
            balance: record.balance,
            banned: record.banned,
            theme: record.profile.theme,
            links: record.profile.links.length,
            ownedThemes: record.ownedThemes.length,
            createdAt: record.createdAt
        };
    }

    router.get('/users', async (req, res, next) => {
        try {
            const all = await store.listUsers();
            res.json({
                success: true,
                users: all.filter((u) => !u.banned).map(summarize),
                banned: all.filter((u) => u.banned).map(summarize)
            });
        } catch (err) {
            next(err);
        }
    });

    async function setBanned(req, res, next, banned) {
        try {
            const username = String(req.body.username || '').toLowerCase();
            const record = await store.getUser(username);
            if (!record) return res.status(404).json({ success: false, message: 'بەکارهێنەر نەدۆزرایەوە!' });
            if (record.role === 'admin') {
                return res.status(400).json({ success: false, message: 'ناتوانرێت ئەدمن بان بکرێت!' });
            }

            record.banned = banned;
            // Banning must also kill any session the user already holds.
            record.sessionVersion += 1;
            await store.saveUser(record);
            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    }

    router.post('/ban', (req, res, next) => setBanned(req, res, next, true));
    router.post('/unban', (req, res, next) => setBanned(req, res, next, false));

    // Top-ups are applied by an admin; there is no payment provider wired up.
    router.post('/balance', async (req, res, next) => {
        try {
            const username = String(req.body.username || '').toLowerCase();
            const amount = Number(req.body.amount);
            if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > MAX_CREDIT) {
                return res.status(400).json({ success: false, message: 'بڕی نادروست!' });
            }

            const record = await store.getUser(username);
            if (!record) return res.status(404).json({ success: false, message: 'بەکارهێنەر نەدۆزرایەوە!' });

            record.balance = Math.max(0, Math.round((record.balance + amount) * 100) / 100);
            await store.saveUser(record);
            res.json({ success: true, balance: record.balance });
        } catch (err) {
            next(err);
        }
    });

    return router;
}

module.exports = { adminRoutes };
