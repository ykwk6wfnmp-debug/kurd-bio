'use strict';

const crypto = require('crypto');
const config = require('../config');

/**
 * Stateless signed session cookies.
 *
 * The cookie carries `username|role|sessionVersion|issuedAt` plus an HMAC.
 * Being stateless means sessions survive a restart (an in-process session store
 * would not), and `sessionVersion` gives us a way to invalidate every existing
 * cookie for a user when their password or username changes.
 */

function b64url(buf) {
    return Buffer.from(buf).toString('base64url');
}

function sign(payload) {
    return crypto.createHmac('sha256', config.sessionSecret).update(payload).digest();
}

function createToken({ username, role, sessionVersion }) {
    const payload = b64url(
        JSON.stringify({ u: username, r: role, v: sessionVersion, t: Date.now() })
    );
    return `${payload}.${b64url(sign(payload))}`;
}

function verifyToken(token) {
    if (typeof token !== 'string' || token.length > 1024) return null;
    const dot = token.indexOf('.');
    if (dot < 1) return null;

    const payload = token.slice(0, dot);
    const provided = Buffer.from(token.slice(dot + 1), 'base64url');
    const expected = sign(payload);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;

    let data;
    try {
        data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch (_) {
        return null;
    }
    if (!data || typeof data.u !== 'string') return null;
    if (!Number.isFinite(data.t) || Date.now() - data.t > config.sessionMaxAgeMs) return null;
    return { username: data.u, role: data.r, sessionVersion: data.v };
}

function cookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.cookieSecure,
        path: '/',
        maxAge: config.sessionMaxAgeMs
    };
}

function startSession(res, record) {
    res.cookie(config.sessionCookieName, createToken(record), cookieOptions());
}

function endSession(res) {
    res.clearCookie(config.sessionCookieName, { ...cookieOptions(), maxAge: undefined });
}

/**
 * Resolves the cookie into `req.user` (the full record) on every request.
 * A cookie for a deleted, banned or re-versioned user is dropped.
 */
function loadSession(store) {
    return async function loadSessionMiddleware(req, res, next) {
        req.user = null;
        const token = req.cookies ? req.cookies[config.sessionCookieName] : null;
        if (!token) return next();

        const claims = verifyToken(token);
        if (!claims) {
            endSession(res);
            return next();
        }

        try {
            const record = await store.getUser(claims.username);
            if (!record || record.banned || record.sessionVersion !== claims.sessionVersion) {
                endSession(res);
                return next();
            }
            req.user = record;
            next();
        } catch (err) {
            next(err);
        }
    };
}

// originalUrl, not path: inside a router mounted at /api, req.path is relative.
function wantsJson(req) {
    return req.originalUrl.startsWith('/api/');
}

function requireAuth(req, res, next) {
    if (req.user) return next();
    if (wantsJson(req)) return res.status(401).json({ success: false, message: 'پێویستە بچیتە ژوورەوە!' });
    return res.redirect('/');
}

function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') return next();
    if (wantsJson(req)) return res.status(403).json({ success: false, message: 'ڕێگەپێدراو نیت!' });
    return res.redirect('/');
}

module.exports = { startSession, endSession, loadSession, requireAuth, requireAdmin };
