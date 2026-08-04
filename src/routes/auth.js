'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const { rateLimit } = require('../lib/rate-limit');
const { startSession, endSession, requireAuth } = require('../lib/session');
const { checkUsername, checkPassword, checkEmail } = require('../lib/validation');
const { createRecord } = require('../store/record');
const { publicProfileUrl } = require('../lib/urls');
const { getTheme } = require('../themes');

const BCRYPT_ROUNDS = 10;
// Compared against when the account does not exist, so a wrong username and a
// wrong password take the same amount of time.
const DUMMY_HASH = bcrypt.hashSync('kurdbio-dummy-password', BCRYPT_ROUNDS);

function authRoutes(store) {
    const router = express.Router();

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 15,
        message: 'هەوڵی زۆرت داوە. تکایە چەند خولەکێک چاوەڕێ بکە.'
    });

    router.post('/register', authLimiter, async (req, res, next) => {
        try {
            const username = checkUsername(req.body.username);
            const password = checkPassword(req.body.password);
            const email = checkEmail(req.body.email); // optional, admin-visible only

            if (await store.getUser(username)) {
                return res.status(409).json({ success: false, message: 'ئەم یوزەرنەمەیە بەردەست نییە!' });
            }

            const record = createRecord({
                username,
                email,
                passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS)
            });
            await store.saveUser(record);
            startSession(res, record);
            res.json({ success: true, redirect: '/dashboard' });
        } catch (err) {
            next(err);
        }
    });

    router.post('/login', authLimiter, async (req, res, next) => {
        try {
            const username = String(req.body.username || '').trim().toLowerCase();
            const password = String(req.body.password || '');
            const record = await store.getUser(username);

            const ok = await bcrypt.compare(password, record ? record.passwordHash : DUMMY_HASH);
            if (!record || !ok) {
                return res.status(401).json({ success: false, message: 'ناوی بەکارهێنەر یان وشەی تێپەڕ هەڵەیە!' });
            }
            if (record.banned) {
                return res.status(403).json({ success: false, message: 'هەژمارەکەت بانکراوە!' });
            }

            startSession(res, record);
            res.json({ success: true, redirect: record.role === 'admin' ? '/admin' : '/dashboard' });
        } catch (err) {
            next(err);
        }
    });

    router.post('/logout', (req, res) => {
        endSession(res);
        res.json({ success: true, redirect: '/' });
    });

    // Private counterpart of /api/public-profile/:username — owner only.
    router.get('/me', requireAuth, (req, res) => {
        const user = req.user;
        res.json({
            success: true,
            user: {
                username: user.username,
                role: user.role,
                email: user.email,
                balance: user.balance,
                ownedThemes: user.ownedThemes,
                theme: getTheme(user.profile.theme).id,
                profile: user.profile,
                shareUrl: publicProfileUrl(req, user.username)
            }
        });
    });

    return router;
}

module.exports = { authRoutes, BCRYPT_ROUNDS };
