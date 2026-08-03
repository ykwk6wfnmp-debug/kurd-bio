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
    console.log(
        store.kind === 'postgres'
            ? '[store] using Postgres (DATABASE_URL)'
            : `[store] using JSON file ${config.dataFile} — set DATABASE_URL for a durable deploy`
    );
    return store;
}

module.exports = { createStore };
