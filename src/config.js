'use strict';

const crypto = require('crypto');

function bool(value, fallback) {
    if (value === undefined) return fallback;
    return value === '1' || value.toLowerCase() === 'true';
}

const isProduction = process.env.NODE_ENV === 'production';

let sessionSecret = process.env.SESSION_SECRET;
let sessionSecretIsEphemeral = false;
if (!sessionSecret) {
    sessionSecret = crypto.randomBytes(32).toString('hex');
    sessionSecretIsEphemeral = true;
}

module.exports = {
    isProduction,
    port: Number(process.env.PORT) || 4000,

    // Sessions
    sessionSecret,
    sessionSecretIsEphemeral,
    sessionCookieName: 'kb_session',
    sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
    // Render terminates TLS at the proxy, so `secure` cookies still work there.
    cookieSecure: bool(process.env.COOKIE_SECURE, isProduction),

    // Storage
    databaseUrl: process.env.DATABASE_URL || '',
    dataFile: process.env.DATA_FILE || 'data/store.json',

    // Admin seed
    adminUser: (process.env.ADMIN_USER || 'admin').toLowerCase(),
    adminPassword: process.env.ADMIN_PASSWORD || '',

    // Public URL used when building the shareable profile link.
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, ''),

    // Comma separated list of allowed cross-origin callers. Empty = same-origin only.
    corsOrigins: (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),

    // Request body cap: an avatar is capped at 300KB of base64, plus room for the rest.
    jsonBodyLimit: '400kb'
};
