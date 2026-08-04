'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const { requireAuth, startSession } = require('../lib/session');
const { rateLimit } = require('../lib/rate-limit');
const {
    checkUsername,
    checkPassword,
    checkEmail,
    checkText,
    checkAvatar,
    checkSocials,
    checkLinks,
    LIMITS
} = require('../lib/validation');
const { publicProfile } = require('../store/record');
const { FAMILIES, TOTAL, getTheme, isValidTheme, isValidFamily, queryThemes } = require('../themes');
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
            // Design tokens only — the visitor gets no name, price or tier.
            const t = getTheme(record.profile.theme);
            res.json({
                success: true,
                profile: publicProfile(record, {
                    id: t.id,
                    family: t.family,
                    bg: t.bg,
                    bgImage: t.bgImage,
                    surface: t.surface,
                    surfaceBorder: t.surfaceBorder,
                    text: t.text,
                    muted: t.muted,
                    accent: t.accent,
                    accent2: t.accent2,
                    radius: t.radius,
                    shadow: t.shadow,
                    btnStyle: t.btnStyle,
                    glow: t.glow,
                    blur: t.blur,
                    animated: t.animated,
                    borderWidth: t.borderWidth,
                    letterSpacing: t.letterSpacing,
                    fontWeight: t.fontWeight
                })
            });
        } catch (err) {
            next(err);
        }
    });

    /**
     * Catalog + (when signed in) what this user owns and can afford.
     *
     * Paged, because the catalog is 1000 themes (~350KB serialized in full) and
     * no phone should download that to browse a grid.
     *   ?family=neon&page=2&pageSize=48   browse one family
     *   ?ids=theme_7,theme_842            resolve specific themes by id
     */
    router.get('/themes', (req, res) => {
        const family = req.query.family ? String(req.query.family) : '';
        if (family && !isValidFamily(family)) {
            return res.status(400).json({ success: false, message: 'ئەم جۆرە دیزاینە بوونی نییە!' });
        }

        const result = queryThemes({
            family,
            page: req.query.page,
            pageSize: req.query.pageSize,
            ids: req.query.ids
        });

        // The catalog is immutable at runtime, but the owned/balance fields are
        // per-user, so this must never land in a shared cache.
        res.set('Cache-Control', 'private, max-age=300');
        res.json({
            success: true,
            themes: result.themes,
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
            catalogTotal: TOTAL,
            families: FAMILIES,
            family: family || null,
            current: req.user ? getTheme(req.user.profile.theme).id : null,
            owned: req.user ? req.user.ownedThemes : [],
            balance: req.user ? req.user.balance : 0
        });
    });

    /* ---------- owner only ---------- */

    router.post('/save-bio', requireAuth, async (req, res, next) => {
        try {
            // The username always comes from the session, never from the body.
            // Validate everything up front so the mutator itself cannot throw.
            const profile = {
                name: checkText(req.body.name, LIMITS.name, 'ناو') || req.user.username,
                bio: checkText(req.body.bio, LIMITS.bio, 'کورتە دەق'),
                avatar: checkAvatar(req.body.avatar),
                socials: checkSocials(req.body.socials),
                links: checkLinks(req.body.links)
            };

            // Touch only the profile fields. Writing the whole record back here
            // would silently discard a balance change made while the user was
            // filling in this form.
            const outcome = await store.mutateUser(req.user.username, (draft) => {
                Object.assign(draft.profile, profile);
            });
            if (!outcome) return res.status(404).json({ success: false, message: 'بەکارهێنەر نەدۆزرایەوە!' });

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
            // Set inside the mutator, which both backends run exactly once per
            // call with no retry loop, so this reflects what was really charged
            // against the balance at commit time.
            let charged = 0;

            // Debit and theme change happen in one indivisible step: reading the
            // balance and writing it back separately loses any concurrent admin
            // credit, and could let two parallel requests buy on one balance.
            const outcome = await store.mutateUser(req.user.username, (draft) => {
                // Charge once, on first purchase only. Switching back to a theme
                // the user already owns is always free.
                if (theme.vip && !draft.ownedThemes.includes(theme.id)) {
                    if (draft.balance < theme.price) return false; // veto, nothing written
                    draft.balance -= theme.price;
                    draft.ownedThemes.push(theme.id);
                    charged = theme.price;
                }
                draft.profile.theme = theme.id;
            });

            if (!outcome) {
                return res.status(404).json({ success: false, message: 'بەکارهێنەر نەدۆزرایەوە!' });
            }
            if (!outcome.ok) {
                return res.status(402).json({
                    success: false,
                    message: `باڵانسەکەت بەشی ئەم دیزاینە ناکات. پێویستت بە ${theme.price} $ ـە.`
                });
            }

            res.json({
                success: true,
                charged,
                balance: outcome.record.balance,
                owned: outcome.record.ownedThemes
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
            // Optional; blank clears it. Admin-visible only, never public.
            const email = checkEmail(req.body.email);

            if (wantsRename && (await store.getUser(newUsername))) {
                return res.status(409).json({ success: false, message: 'ئەم یوزەرنەمەیە پێشتر هەیە!' });
            }

            // Hash before the mutator, which must stay synchronous.
            const newHash = rawNewPassword
                ? await bcrypt.hash(checkPassword(rawNewPassword), BCRYPT_ROUNDS)
                : null;

            const outcome = await store.mutateUser(record.username, (draft) => {
                if (newHash) draft.passwordHash = newHash;
                draft.email = email;
                // Any credential change invalidates cookies issued before it.
                draft.sessionVersion += 1;
            });
            if (!outcome) return res.status(404).json({ success: false, message: 'بەکارهێنەر نەدۆزرایەوە!' });
            record.sessionVersion = outcome.record.sessionVersion;

            if (wantsRename) {
                const oldUsername = record.username;
                await store.renameUser(oldUsername, newUsername);
                // Keep the display name in sync when it was just the old handle.
                await store.mutateUser(newUsername, (draft) => {
                    if (draft.profile.name === oldUsername) draft.profile.name = newUsername;
                });
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
