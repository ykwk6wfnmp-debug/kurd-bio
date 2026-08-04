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

test('the catalog is 1000 themes across 10 families with 50 free', () => {
    const { THEMES, FAMILIES } = require('../src/themes');
    assert.strictEqual(THEMES.length, 1000);
    assert.strictEqual(FAMILIES.length, 10);

    const free = THEMES.filter((t) => t.price === 0);
    const vip = THEMES.filter((t) => t.price === 5);
    const legendary = THEMES.filter((t) => t.price === 10);
    assert.strictEqual(free.length, 50);
    assert.strictEqual(vip.length, 850);
    assert.strictEqual(legendary.length, 100);
    assert.strictEqual(free.length + vip.length + legendary.length, 1000);

    // Tier and price must never disagree.
    assert.ok(THEMES.every((t) => (t.tier === 'free') === (t.price === 0)));
    assert.ok(THEMES.every((t) => t.vip === t.price > 0));

    // Every family must be reachable for free, and every theme must carry a
    // full token set or the profile page renders a half-styled card.
    for (const family of FAMILIES) {
        const inFamily = THEMES.filter((t) => t.family === family.key);
        assert.strictEqual(inFamily.length, 100, family.key);
        assert.strictEqual(inFamily.filter((t) => t.price === 0).length, 5, family.key);
    }
    for (const key of ['bg', 'surface', 'surfaceBorder', 'text', 'muted', 'accent', 'accent2', 'radius', 'btnStyle']) {
        assert.ok(THEMES.every((t) => t[key] !== undefined && t[key] !== ''), `missing ${key}`);
    }
});

test('theme_1 is still free and still the default', async () => {
    const { getTheme } = require('../src/themes');
    const { DEFAULT_THEME } = require('../src/store/record');
    assert.strictEqual(getTheme(DEFAULT_THEME).price, 0);
    assert.strictEqual(DEFAULT_THEME, 'theme_1');
});

test('GET /api/themes paginates instead of dumping 1000 themes', async () => {
    const req = client();
    const first = await req('GET', '/api/themes');
    assert.strictEqual(first.status, 200);
    assert.strictEqual(first.json.themes.length, 48);
    assert.strictEqual(first.json.total, 1000);
    assert.strictEqual(first.json.catalogTotal, 1000);
    assert.strictEqual(first.json.families.length, 10);

    // A page must stay small enough for a phone.
    assert.ok(first.text.length < 60 * 1024, `page was ${first.text.length} bytes`);

    const page2 = await req('GET', '/api/themes?page=2&pageSize=10');
    assert.strictEqual(page2.json.themes.length, 10);
    assert.strictEqual(page2.json.themes[0].id, 'theme_11');

    // Out-of-range and oversized inputs clamp rather than error.
    assert.strictEqual((await req('GET', '/api/themes?page=99999')).json.page, 21);
    assert.strictEqual((await req('GET', '/api/themes?page=0')).json.page, 1);
    assert.ok((await req('GET', '/api/themes?pageSize=5000')).json.pageSize <= 60);
});

test('GET /api/themes filters by family and rejects unknown ones', async () => {
    const req = client();
    const neon = await req('GET', '/api/themes?family=neon&pageSize=60');
    assert.strictEqual(neon.json.total, 100);
    assert.ok(neon.json.themes.every((t) => t.family === 'neon'));

    assert.strictEqual((await req('GET', '/api/themes?family=nope')).status, 400);
});

test('GET /api/themes?ids= resolves specific themes and is capped', async () => {
    const req = client();
    const res = await req('GET', '/api/themes?ids=theme_7,theme_999,not_a_theme');
    assert.deepStrictEqual(res.json.themes.map((t) => t.id), ['theme_7', 'theme_999']);

    const many = Array.from({ length: 200 }, (_, i) => `theme_${i + 1}`).join(',');
    assert.ok((await req('GET', `/api/themes?ids=${many}`)).json.themes.length <= 60);
});

test('a legendary theme costs 10 and is charged once', async () => {
    const req = client();
    await req('POST', '/api/register', { username: 'collector', password: 'secret123' });

    const user = await store.getUser('collector');
    user.balance = 25;
    await store.saveUser(user);

    const buy = await req('POST', '/api/save-theme', { theme: 'theme_91' }); // slot 91 = legendary
    assert.strictEqual(buy.json.charged, 10);
    assert.strictEqual(buy.json.balance, 15);

    await req('POST', '/api/save-theme', { theme: 'theme_1' });
    const again = await req('POST', '/api/save-theme', { theme: 'theme_91' });
    assert.strictEqual(again.json.charged, 0);
    assert.strictEqual(again.json.balance, 15);
});

test('the public profile carries theme design tokens, not private fields', async () => {
    const req = client();
    await req('POST', '/api/register', { username: 'styled', password: 'secret123' });
    await req('POST', '/api/save-theme', { theme: 'theme_3' });

    const anon = client();
    const res = await anon('GET', '/api/public-profile/styled');
    const theme = res.json.profile.theme;
    assert.strictEqual(theme.id, 'theme_3');
    assert.ok(theme.bg && theme.surface && theme.accent && theme.btnStyle);
    // Catalog metadata must not leak into a public response.
    assert.strictEqual(theme.price, undefined);
    assert.strictEqual(theme.tier, undefined);
    assert.strictEqual(theme.name, undefined);
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
