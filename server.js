'use strict';

const config = require('./src/config');
const { createStore } = require('./src/store');
const { seedAdmin } = require('./src/seed-admin');
const { createApp } = require('./src/app');

async function main() {
    if (config.sessionSecretIsEphemeral) {
        console.warn('[config] SESSION_SECRET is not set — a random one was generated.');
        console.warn('[config] Everyone will be signed out on every restart until you set it.');
    }

    const store = await createStore();
    await seedAdmin(store);

    const server = createApp(store).listen(config.port, () => {
        console.log(`🚀 KurdBio running on port ${config.port}`);
    });

    async function shutdown(signal) {
        console.log(`\n[shutdown] ${signal} received, flushing data…`);
        server.close();
        await store.close();
        process.exit(0);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    console.error('[fatal] failed to start:', err);
    process.exit(1);
});
