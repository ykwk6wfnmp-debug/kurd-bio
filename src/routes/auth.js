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

    // Separate buckets. Sharing one meant an admin logging in repeatedly could
    // exhaust the allowance and block genuine signups from the same IP — and
    // two phones on the same WiFi share an IP.
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10, // tight: this is the brute-force surface
        message: 'هەوڵی زۆری چوونەژوورەوە. تکایە ١٥ خولەک چاوەڕێ بکە.'
    });

    const registerLimiter = rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 20, // generous: a blocked signup costs a real user
        message: 'هەوڵی زۆری تۆمارکردن لەم ئینتەرنێتەوە. تکایە کاتژمێرێک چاوەڕێ بکە.'
    });

    router.post('/register', registerLimiter, async (req, res, next) => {
        // Every registration outcome is logged. Without this, a signup that was
        // rejected (rate limited, invalid, already taken) is indistinguishable
        // from one that vanished, and the only place to look is the host's logs.
        const attempted = String(req.body && req.body.username);
        try {
            const username = checkUsername(req.body.username);
            const password = checkPassword(req.body.password);
            const email = checkEmail(req.body.email); // optional, admin-visible only

            if (await store.getUser(username)) {
                console.warn(`[register] REJECTED "${username}" — username already exists`);
                return res.status(409).json({ success: false, message: 'ئەم یوزەرنەمەیە بەردەست نییە!' });
            }

            const record = createRecord({
                username,
                email,
                passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS)
            });
            await store.saveUser(record);

            // Read it back through the store before claiming success, so a
            // write that did not land can never look like one that did.
            const persisted = await store.getUser(username);
            if (!persisted) {
                console.error(`[register] WRITE LOST for "${username}" — saveUser returned but the row is not readable`);
                return res.status(500).json({ success: false, message: 'هەڵەیەک ڕوویدا لە خەزنکردنی هەژمار.' });
            }

            console.log(`[register] OK "${username}" (email: ${email ? 'yes' : 'no'})`);
            startSession(res, record);
            res.json({ success: true, redirect: '/dashboard' });
        } catch (err) {
            console.warn(`[register] REJECTED "${attempted}" — ${err.name}: ${err.message}`);
            next(err);
        }
    });

    router.post('/login', loginLimiter, async (req, res, next) => {
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
