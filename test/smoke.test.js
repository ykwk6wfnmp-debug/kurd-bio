'use strict';

/**
 * End-to-end smoke tests. Runs the real app against a throwaway JSON store.
 *   npm test
 */

const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kurdbio-test-'));
process.env.DATA_FILE = path.join(tmpDir, 'store.json');
process.env.SESSION_SECRET = 'test-secret-not-for-production';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASSWORD = 'admin-test-password';
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;

const { createStore } = require('../src/store');
const { seedAdmin } = require('../src/seed-admin');
const { createApp } = require('../src/app');

let baseUrl;
let store;
let server;

test.before(async () => {
    store = await createStore();
    await seedAdmin(store);
    server = createApp(store).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    server.close();
    await store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Minimal cookie-jar client. Each one presents a distinct X-Forwarded-For so
 * the per-IP rate limiter treats tests independently (the app trusts one proxy
 * hop, which is how it runs on Render).
 */
let clientCounter = 0;
function client(ip) {
    let cookie = '';
    clientCounter += 1;
    const forwardedFor = ip || `10.0.0.${clientCounter}`;
    return async function request(method, url, body) {
        const res = await fetch(baseUrl + url, {
            method,
            redirect: 'manual',
            headers: Object.assign(
                { 'x-forwarded-for': forwardedFor },
                cookie ? { cookie } : {},
                body !== undefined ? { 'content-type': 'application/json' } : {}
            ),
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) cookie = setCookie.split(';')[0];
        const text = await res.text();
        let json = null;
        try {
            json = JSON.parse(text);
        } catch (_) {
            /* html response */
        }
        return { status: res.status, json, text, location: res.headers.get('location') };
    };
}

test('registers a user and starts a session', async () => {
    const req = client();
    const res = await req('POST', '/api/register', { username: 'ahmad', password: 'secret123' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.success, true);

    const me = await req('GET', '/api/me');
    assert.strictEqual(me.json.user.username, 'ahmad');
});

test('rejects invalid usernames and short passwords', async () => {
    const req = client();
    assert.strictEqual((await req('POST', '/api/register', { username: 'AB', password: 'secret123' })).status, 400);
    assert.strictEqual((await req('POST', '/api/register', { username: 'has space', password: 'secret123' })).status, 400);
    assert.strictEqual((await req('POST', '/api/register', { username: 'valid_one', password: '123' })).status, 400);
});

test('passwords are hashed, never stored in plaintext', async () => {
    const record = await store.getUser('ahmad');
    assert.ok(record.passwordHash.startsWith('$2'));
    assert.ok(!JSON.stringify(record).includes('secret123'));
});

test('write endpoints ignore any username in the body', async () => {
    const victim = client();
    await victim('POST', '/api/register', { username: 'victim', password: 'secret123' });
    await victim('POST', '/api/save-bio', { name: 'Victim', bio: 'mine', links: [] });

    const attacker = client();
    await attacker('POST', '/api/register', { username: 'attacker', password: 'secret123' });
    await attacker('POST', '/api/save-bio', { username: 'victim', name: 'HACKED', bio: 'pwned', links: [] });

    const victimRecord = await store.getUser('victim');
    assert.strictEqual(victimRecord.profile.name, 'Victim');
    const attackerRecord = await store.getUser('attacker');
    assert.strictEqual(attackerRecord.profile.name, 'HACKED');
});

test('unauthenticated writes are refused', async () => {
    const anon = client();
    const res = await anon('POST', '/api/save-bio', { name: 'nope', links: [] });
    assert.strictEqual(res.status, 401);
});

test('dashboard redirects anonymous visitors to the login page', async () => {
    const anon = client();
    const res = await anon('GET', '/dashboard');
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.location, '/');
});

test('non-http link URLs are rejected', async () => {
    const req = client();
    await req('POST', '/api/register', { username: 'linker', password: 'secret123' });

    for (const url of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://x.com']) {
        const res = await req('POST', '/api/save-bio', { name: 'L', links: [{ id: 1, title: 't', url }] });
        assert.strictEqual(res.status, 400, `expected ${url} to be rejected`);
    }

    const ok = await req('POST', '/api/save-bio', {
        name: 'L',
        links: [{ id: 1, title: '<img src=x onerror=alert(1)>', url: 'https://example.com' }]
    });
    assert.strictEqual(ok.status, 200);
});

test('public profile exposes only public fields', async () => {
    const anon = client();
    const res = await anon('GET', '/api/public-profile/ahmad');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.profile.balance, undefined);
    assert.strictEqual(res.json.profile.passwordHash, undefined);
    assert.strictEqual(res.json.profile.role, undefined);
});

test('requesting an unknown profile does not create a user', async () => {
    const anon = client();
    const res = await anon('GET', '/api/public-profile/ghost_user');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(await store.getUser('ghost_user'), null);
});

test('VIP themes charge exactly once', async () => {
    const req = client();
    await req('POST', '/api/register', { username: 'buyer', password: 'secret123' });

    const buyer = await store.getUser('buyer');
    buyer.balance = 10;
    await store.saveUser(buyer);

    const first = await req('POST', '/api/save-theme', { theme: 'theme_71' });
    assert.strictEqual(first.json.charged, 5);
    assert.strictEqual(first.json.balance, 5);

    await req('POST', '/api/save-theme', { theme: 'theme_1' }); // free theme
    const second = await req('POST', '/api/save-theme', { theme: 'theme_71' }); // back to owned VIP
    assert.strictEqual(second.json.charged, 0);
    assert.strictEqual(second.json.balance, 5);
});

test('a VIP theme cannot be taken without balance', async () => {
    const req = client();
    await req('POST', '/api/register', { username: 'broke_user', password: 'secret123' });
    const res = await req('POST', '/api/save-theme', { theme: 'theme_80' });
    assert.strictEqual(res.status, 402);
});

test('avatars are size and mime checked', async () => {
    const req = client();
    await req('POST', '/api/register', { username: 'painter', password: 'secret123' });

    const bad = await req('POST', '/api/save-bio', { name: 'p', avatar: 'data:text/html;base64,PHNjcmlwdD4=', links: [] });
    assert.strictEqual(bad.status, 400);

    const huge = 'data:image/png;base64,' + 'A'.repeat(400 * 1024);
    const tooBig = await req('POST', '/api/save-bio', { name: 'p', avatar: huge, links: [] });
    assert.ok(tooBig.status === 400 || tooBig.status === 413);
});

test('legacy /profile?user= redirects to /u/:username', async () => {
    const anon = client();
    const res = await anon('GET', '/profile?user=ahmad');
    assert.strictEqual(res.status, 301);
    assert.strictEqual(res.location, '/u/ahmad');
});

test('the public profile page has no dashboard link', async () => {
    const anon = client();
    const page = await anon('GET', '/u/ahmad');
    assert.strictEqual(page.status, 200);
    assert.ok(!page.text.includes('گەڕانەوە بۆ داشبۆرد'));
    assert.ok(!page.text.includes('/dashboard'));
});

test('admin endpoints are closed to normal users', async () => {
    const req = client();
    await req('POST', '/api/login', { username: 'ahmad', password: 'secret123' });
    assert.strictEqual((await req('GET', '/api/admin/users')).status, 403);
    assert.strictEqual((await req('POST', '/api/admin/ban', { username: 'victim' })).status, 403);
});

test('admin logs in by role and can ban and unban', async () => {
    const req = client();
    const login = await req('POST', '/api/login', { username: 'admin', password: 'admin-test-password' });
    assert.strictEqual(login.json.redirect, '/admin');

    const list = await req('GET', '/api/admin/users');
    assert.ok(list.json.users.length > 0);
    assert.ok(list.json.users.every((u) => u.passwordHash === undefined));

    await req('POST', '/api/admin/ban', { username: 'victim' });
    const banned = client();
    const attempt = await banned('POST', '/api/login', { username: 'victim', password: 'secret123' });
    assert.strictEqual(attempt.status, 403);
    assert.strictEqual((await banned('GET', '/api/public-profile/victim')).status, 404);

    await req('POST', '/api/admin/unban', { username: 'victim' });
    assert.strictEqual((await banned('POST', '/api/login', { username: 'victim', password: 'secret123' })).status, 200);
});

test('the hardcoded admin/admin123 credential is gone', async () => {
    const anon = client();
    const res = await anon('POST', '/api/login', { username: 'admin', password: 'admin123' });
    assert.strictEqual(res.status, 401);
});

test('changing the password invalidates existing sessions', async () => {
    const req = client();
    await req('POST', '/api/register', { username: 'rotator', password: 'secret123' });
    const stale = client();
    await stale('POST', '/api/login', { username: 'rotator', password: 'secret123' });

    const changed = await req('POST', '/api/account', {
        currentPassword: 'secret123',
        newUsername: 'rotator',
        newPassword: 'brandnew456'
    });
    assert.strictEqual(changed.status, 200);
    assert.strictEqual((await stale('GET', '/api/me')).status, 401);
});

test('account changes require the current password', async () => {
    const req = client();
    await req('POST', '/api/register', { username: 'careful', password: 'secret123' });
    const res = await req('POST', '/api/account', { currentPassword: 'wrong', newUsername: 'careful2' });
    assert.strictEqual(res.status, 401);
});

test('logout clears the session cookie', async () => {
    const req = client();
    await req('POST', '/api/register', { username: 'leaver', password: 'secret123' });
    await req('POST', '/api/logout');
    assert.strictEqual((await req('GET', '/api/me')).status, 401);
});

test('login is rate limited', async () => {
    const req = client();
    let sawLimit = false;
    for (let i = 0; i < 25; i += 1) {
        const res = await req('POST', '/api/login', { username: 'nobody_here', password: 'nope12345' });
        if (res.status === 429) {
            sawLimit = true;
            break;
        }
    }
    assert.ok(sawLimit, 'expected a 429 after repeated login attempts');
});

test('data survives a restart', async () => {
    await store.flush();
    const raw = JSON.parse(fs.readFileSync(process.env.DATA_FILE, 'utf8'));
    assert.ok(raw.users.some((u) => u.username === 'ahmad'));
});
