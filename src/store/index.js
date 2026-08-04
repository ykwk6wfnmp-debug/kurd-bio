'use strict';

const config = require('../config');
const { createJsonStore } = require('./json-store');
const { createPgStore } = require('./pg-store');

/**
 * Picks the backend: Postgres when DATABASE_URL is set, otherwise a JSON file.
 * Both expose the same async API, so no caller needs to care which one it got.
 */
async function createStore() {
    const store = config.databaseUrl
        ? createPgStore(config.databaseUrl)
        : createJsonStore(config.dataFile);

    await store.init();

    if (store.kind === 'postgres') {
        console.log('[store] using Postgres (DATABASE_URL) — data is durable');
    } else if (config.isProduction) {
        // On Render/Railway the filesystem is ephemeral, so this is data loss
        // waiting to happen: accounts vanish on every deploy, restart and idle
        // spin-down. Worth shouting about.
        console.warn('════════════════════════════════════════════════════════');
        console.warn('[store] WARNING: DATABASE_URL is not set.');
        console.warn(`[store] Using the JSON file ${config.dataFile}.`);
        console.warn('[store] Hosts with an ephemeral filesystem (Render, Railway)');
        console.warn('[store] WIPE this on every restart, deploy and idle spin-down.');
        console.warn('[store] Newly registered users WILL disappear. Set DATABASE_URL.');
        console.warn('════════════════════════════════════════════════════════');
    } else {
        console.log(`[store] using JSON file ${config.dataFile} — set DATABASE_URL for a durable deploy`);
    }
    return store;
}

module.exports = { createStore };
