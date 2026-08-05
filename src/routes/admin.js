'use strict';

const express = require('express');
const config = require('../config');
const { requireAdmin } = require('../lib/session');

const MAX_CREDIT = 10000;
// Regenerated on every boot, so a changing value across refreshes reveals
// multiple instances or multiple deployments answering the same URL.
const INSTANCE_ID = require('crypto').randomBytes(4).toString('hex');
const STARTED_AT = new Date().toISOString();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Calendar day in the configured zone, as YYYY-MM-DD, for cheap comparison. */
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.statsTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

function localDay(date) {
    return dayFormatter.format(date);
}

function adminRoutes(store) {
    const router = express.Router();
    router.use(requireAdmin);

    // Never leaks password hashes. Email is admin-only and appears nowhere else.
    function summarize(record) {
        return {
            username: record.username,
            email: record.email || '',
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

    /**
     * Signup counters. Deliberately a plain count over listUsers() rather than
     * an analytics pipeline — fine at this scale, revisit past ~tens of
     * thousands of rows.
     */
    router.get('/stats', async (req, res, next) => {
        try {
            const all = await store.listUsers();
            // The admin row is seeded by the server, so it is not a signup.
            const signups = all.filter((u) => u.role !== 'admin');

            const now = new Date();
            const today = localDay(now);
            const weekAgo = now.getTime() - WEEK_MS;

            let newToday = 0;
            let newThisWeek = 0;
            for (const user of signups) {
                const created = new Date(user.createdAt);
                if (Number.isNaN(created.getTime())) continue;
                if (localDay(created) === today) newToday += 1;
                if (created.getTime() >= weekAgo) newThisWeek += 1;
            }

            res.json({
                success: true,
                stats: {
                    totalUsers: signups.length,
                    activeUsers: signups.filter((u) => !u.banned).length,
                    bannedUsers: signups.filter((u) => u.banned).length,
                    withEmail: signups.filter((u) => u.email).length,
                    newToday,
                    newThisWeek,
                    timezone: config.statsTimezone,
                    // Surfaced so "my new signup vanished" is answerable at a
                    // glance: on an ephemeral filesystem the JSON store is
                    // wiped on every restart, deploy and idle spin-down.
                    storage: {
                        kind: store.kind,
                        persistent: store.kind === 'postgres'
                    }
                }
            });
        } catch (err) {
            next(err);
        }
    });

    /**
     * Which database is this process actually writing to, and how many rows
     * does it hold? `instanceId` changes on every boot, so two different values
     * across refreshes mean requests are hitting more than one instance — or
     * more than one deployment.
     */
    router.get('/diagnostics', async (req, res, next) => {
        try {
            const storage = store.describe ? await store.describe() : { kind: store.kind };
            const listed = await store.listUsers();
            res.json({
                success: true,
                diagnostics: {
                    storage,
                    listedUsers: listed.length,
                    // If the table's own count and what listUsers() returns
                    // disagree, rows are being dropped between SQL and the API.
                    rowsDropped:
                        typeof storage.rows === 'number' ? storage.rows - listed.length : null,
                    usernames: listed.map((u) => u.username),
                    instanceId: INSTANCE_ID,
                    uptimeSeconds: Math.round(process.uptime()),
                    startedAt: STARTED_AT,
                    nodeEnv: process.env.NODE_ENV || 'development'
                }
            });
        } catch (err) {
            next(err);
        }
    });

    async function setBanned(req, res, next, banned) {
        try {
            const username = String(req.body.username || '').toLowerCase();
            const existing = await store.getUser(username);
            if (!existing) return res.status(404).json({ success: false, message: 'بەکارهێنەر نەدۆزرایەوە!' });
            if (existing.role === 'admin') {
                return res.status(400).json({ success: false, message: 'ناتوانرێت ئەدمن بان بکرێت!' });
            }

            const outcome = await store.mutateUser(username, (draft) => {
                draft.banned = banned;
                // Banning must also kill any session the user already holds.
                draft.sessionVersion += 1;
            });
            if (!outcome) return res.status(404).json({ success: false, message: 'بەکارهێنەر نەدۆزرایەوە!' });

            res.json({ success: true, banned: outcome.record.banned });
        } catch (err) {
            next(err);
        }
    }

    router.post('/ban', (req, res, next) => setBanned(req, res, next, true));
    router.post('/unban', (req, res, next) => setBanned(req, res, next, false));

    /**
     * Manual top-up / correction. Applied through mutateUser so the read and
     * the write are one indivisible step — a plain read-modify-write here loses
     * the credit whenever the user is doing anything else at the same moment.
     */
    router.post('/balance', async (req, res, next) => {
        try {
            const username = String(req.body.username || '').toLowerCase();
            const amount = Number(req.body.amount);
            if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > MAX_CREDIT) {
                return res.status(400).json({ success: false, message: 'بڕی نادروست!' });
            }

            const outcome = await store.mutateUser(username, (draft) => {
                // Round to cents so repeated float additions cannot drift.
                draft.balance = Math.max(0, Math.round((draft.balance + amount) * 100) / 100);
            });
            if (!outcome) return res.status(404).json({ success: false, message: 'بەکارهێنەر نەدۆزرایەوە!' });

            res.json({ success: true, balance: outcome.record.balance });
        } catch (err) {
            next(err);
        }
    });

    return router;
}

module.exports = { adminRoutes };
