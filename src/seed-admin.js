'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { createRecord } = require('./store/record');

/**
 * The admin is an ordinary user row with `role: 'admin'`. There is no
 * hardcoded credential anywhere: the password comes from ADMIN_PASSWORD, and
 * if that is unset a random one is generated and printed once at startup.
 */
async function seedAdmin(store) {
    const username = config.adminUser;
    const existing = await store.getUser(username);

    if (existing) {
        if (existing.role !== 'admin') {
            existing.role = 'admin';
            await store.saveUser(existing);
        }
        return;
    }

    let password = config.adminPassword;
    let generated = false;
    if (!password) {
        password = crypto.randomBytes(12).toString('base64url');
        generated = true;
    }

    const record = createRecord({
        username,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'admin'
    });
    await store.saveUser(record);

    if (generated) {
        console.log('──────────────────────────────────────────────');
        console.log(`[admin] created "${username}" with a generated password:`);
        console.log(`[admin]   ${password}`);
        console.log('[admin] set ADMIN_PASSWORD to choose your own.');
        console.log('──────────────────────────────────────────────');
    } else {
        console.log(`[admin] created "${username}" from ADMIN_USER / ADMIN_PASSWORD`);
    }
}

module.exports = { seedAdmin };
