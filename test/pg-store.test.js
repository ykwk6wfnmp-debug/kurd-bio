'use strict';

/**
 * Executes the real SQL in src/store/pg-store.js against an in-memory Postgres.
 *
 * Until now every test ran against the JSON store, so the Postgres path — the
 * one that actually runs in production — had never been executed by anything.
 */

const test = require('node:test');
const assert = require('node:assert');
const { newDb } = require('pg-mem');

const { createPgStore } = require('../src/store/pg-store');
const { createRecord } = require('../src/store/record');

function freshStore() {
    // noAstCoverageCheck: pg-mem otherwise rejects re-running
    // CREATE TABLE IF NOT EXISTS with column constraints, which real Postgres
    // accepts and which every restart of the app does.
    const db = newDb({ noAstCoverageCheck: true });
    return createPgStore('postgres://localhost/test', db.adapters.createPg());
}

test('init creates the table and is safe to run repeatedly', async () => {
    const store = freshStore();
    await store.init();
    await store.init(); // IF NOT EXISTS — a restart must not fail
    assert.deepStrictEqual(await store.listUsers(), []);
});

test('a registration is written and reads back intact', async () => {
    const store = freshStore();
    await store.init();

    await store.saveUser(createRecord({ username: 'hawler', passwordHash: 'hash', email: 'h@example.com' }));

    const read = await store.getUser('hawler');
    assert.strictEqual(read.username, 'hawler');
    assert.strictEqual(read.email, 'h@example.com');
    assert.strictEqual(read.passwordHash, 'hash');
    assert.strictEqual(read.balance, 0);
    assert.strictEqual(read.banned, false);
    // The nested profile object must survive the jsonb round trip.
    assert.strictEqual(read.profile.theme, 'theme_1');
    assert.deepStrictEqual(read.profile.links, []);
});

test('a new signup appears in listUsers immediately', async () => {
    const store = freshStore();
    await store.init();
    await store.saveUser(createRecord({ username: 'admin', passwordHash: 'h', role: 'admin' }));

    assert.deepStrictEqual((await store.listUsers()).map((u) => u.username), ['admin']);

    await store.saveUser(createRecord({ username: 'hawler', passwordHash: 'h' }));

    const names = (await store.listUsers()).map((u) => u.username);
    assert.ok(names.includes('hawler'), `expected hawler in ${JSON.stringify(names)}`);
    assert.strictEqual(names.length, 2);
    assert.ok((await store.listUsers()).every((u) => u !== null), 'no row may normalize to null');
});

test('getUser returns null for an unknown username', async () => {
    const store = freshStore();
    await store.init();
    assert.strictEqual(await store.getUser('nobody'), null);
});

test('saveUser upserts rather than duplicating', async () => {
    const store = freshStore();
    await store.init();
    const record = createRecord({ username: 'dup', passwordHash: 'a' });
    await store.saveUser(record);
    record.passwordHash = 'b';
    await store.saveUser(record);

    assert.strictEqual((await store.listUsers()).length, 1);
    assert.strictEqual((await store.getUser('dup')).passwordHash, 'b');
});

test('mutateUser commits, vetoes and reports a missing user', async () => {
    const store = freshStore();
    await store.init();
    await store.saveUser(createRecord({ username: 'wallet', passwordHash: 'h' }));

    const credited = await store.mutateUser('wallet', (draft) => {
        draft.balance += 50;
    });
    assert.strictEqual(credited.ok, true);
    assert.strictEqual(credited.record.balance, 50);
    assert.strictEqual((await store.getUser('wallet')).balance, 50);

    // A veto must roll back and write nothing.
    const vetoed = await store.mutateUser('wallet', (draft) => {
        draft.balance = 9999;
        return false;
    });
    assert.strictEqual(vetoed.ok, false);
    assert.strictEqual((await store.getUser('wallet')).balance, 50);

    assert.strictEqual(await store.mutateUser('ghost', (d) => d), null);
});

test('renameUser moves the row and keeps the data', async () => {
    const store = freshStore();
    await store.init();
    const record = createRecord({ username: 'old', passwordHash: 'h' });
    record.balance = 12;
    await store.saveUser(record);

    await store.renameUser('old', 'new');

    assert.strictEqual(await store.getUser('old'), null);
    const moved = await store.getUser('new');
    assert.strictEqual(moved.username, 'new');
    assert.strictEqual(moved.balance, 12);
    assert.strictEqual((await store.listUsers()).length, 1);
});

test('banning is persisted and the user still lists', async () => {
    const store = freshStore();
    await store.init();
    await store.saveUser(createRecord({ username: 'sara', passwordHash: 'h' }));

    await store.mutateUser('sara', (draft) => {
        draft.banned = true;
        draft.sessionVersion += 1;
    });

    const all = await store.listUsers();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].banned, true);
    assert.strictEqual(all[0].sessionVersion, 2);
});
