'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const { requireAuth, startSession } = require('../lib/session');
const { rateLimit } = require('../lib/rate-limit');
const {
    checkUsername,
    checkPassword,
    checkText,
    checkAvatar,
    checkSocials,
    checkLinks,
    LIMITS
} = require('../lib/validation');
const { publicProfile } = require('../store/record');
const { THEMES, getTheme, isValidTheme } = require('../themes');
const { publicProfileUrl } = require('../lib/urls');

const BCRYPT_ROUNDS = 10;

function profileRoutes(store) {
    const router = express.Router();

    /* ---------- public ---------- */

    // Public view of a profile: no balance, no role, no hash, nothing private.
    router.get('/public-profile/:username', async (req, res, next) => {
        try {
            const username = String(req.params.username || '').toLowerCase();
            const record = await store.getUser(username);
            // Missing and banned look identical from the outside.
            if (!record || record.banned) {
                return res.status(404).json({ success: false, message: 'پڕۆفایل نەدۆزرایەوە!' });
            }
            const theme = getTheme(record.profile.theme);
            res.json({
                success: true,
                profile: publicProfile(record, {
                    id: theme.id,
                    background: theme.background,
                    text: theme.text,
                    accent: theme.accent,
                    surface: theme.surface
                })
            });
        } catch (err) {
            next(err);
        }
    });

    // Catalog + (when signed in) what this user owns and can afford.
    router.get('/themes', (req, res) => {
        res.json({
            success: true,
            themes: THEMES,
            current: req.user ? getTheme(req.user.profile.theme).id : null,
            owned: req.user ? req.user.ownedThemes : [],
            balance: req.user ? req.user.balance : 0
        });
    });

    /* ---------- owner only ---------- */

    router.post('/save-bio', requireAuth, async (req, res, next) => {
        try {
            // The username always comes from the session, never from the body.
            const record = req.user;
            record.profile.name = checkText(req.body.name, LIMITS.name, 'ناو') || record.username;
            record.profile.bio = checkText(req.body.bio, LIMITS.bio, 'کورتە دەق');
            record.profile.avatar = checkAvatar(req.body.avatar);
            record.profile.socials = checkSocials(req.body.socials);
            record.profile.links = checkLinks(req.body.links);

            await store.saveUser(record);
            res.json({ success: true, redirect: '/dashboard' });
        } catch (err) {
            next(err);
        }
    });

    router.post('/save-theme', requireAuth, async (req, res, next) => {
        try {
            const themeId = String(req.body.theme || '');
            if (!isValidTheme(themeId)) {
                return res.status(400).json({ success: false, message: 'ئەم دیزاینە بوونی نییە!' });
            }

            const theme = getTheme(themeId);
            const record = req.user;
            let charged = 0;

            // Charge once, on first purchase only. Switching back to a theme the
            // user already owns is always free.
            if (theme.vip && !record.ownedThemes.includes(theme.id)) {
                if (record.balance < theme.price) {
                    return res.status(402).json({
                        success: false,
                        message: `باڵانسەکەت بەشی ئەم دیزاینە ناکات. پێویستت بە ${theme.price} $ ـە.`
                    });
                }
                record.balance -= theme.price;
                record.ownedThemes.push(theme.id);
                charged = theme.price;
            }

            record.profile.theme = theme.id;
            await store.saveUser(record);
            res.json({
                success: true,
                charged,
                balance: record.balance,
                owned: record.ownedThemes
            });
        } catch (err) {
            next(err);
        }
    });

    const accountLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: 'هەوڵی زۆرت داوە. تکایە چەند خولەکێک چاوەڕێ بکە.'
    });

    router.post('/account', requireAuth, accountLimiter, async (req, res, next) => {
        try {
            const record = req.user;
            const currentPassword = String(req.body.currentPassword || '');
            if (!(await bcrypt.compare(currentPassword, record.passwordHash))) {
                return res.status(401).json({ success: false, message: 'وشەی تێپەڕی ئێستا هەڵەیە!' });
            }

            const newUsername = checkUsername(req.body.newUsername || record.username);
            const wantsRename = newUsername !== record.username;
            const rawNewPassword = String(req.body.newPassword || '');

            if (wantsRename && (await store.getUser(newUsername))) {
                return res.status(409).json({ success: false, message: 'ئەم یوزەرنەمەیە پێشتر هەیە!' });
            }

            if (rawNewPassword) {
                record.passwordHash = await bcrypt.hash(checkPassword(rawNewPassword), BCRYPT_ROUNDS);
            }

            // Any credential change invalidates cookies issued before it.
            record.sessionVersion += 1;
            await store.saveUser(record);

            if (wantsRename) {
                await store.renameUser(record.username, newUsername);
                // Keep the display name in sync when it was just the old handle.
                const renamed = await store.getUser(newUsername);
                if (renamed.profile.name === record.username) {
                    renamed.profile.name = newUsername;
                    await store.saveUser(renamed);
                }
                record.username = newUsername;
            }

            startSession(res, record);
            res.json({
                success: true,
                username: record.username,
                shareUrl: publicProfileUrl(req, record.username),
                redirect: '/dashboard'
            });
        } catch (err) {
            next(err);
        }
    });

    return router;
}

module.exports = { profileRoutes };
