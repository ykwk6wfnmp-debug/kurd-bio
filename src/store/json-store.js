'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { normalizeRecord } = require('./record');

/**
 * File backed store. Everything is kept in memory and flushed to disk
 * atomically (write `.tmp`, then rename) so a crash mid-write cannot leave a
 * truncated store.json behind.
 *
 * Note: this is the fallback for local development. Hosts with an ephemeral
 * filesystem (Render free tier) must set DATABASE_URL instead.
 */
function createJsonStore(filePath) {
    const absolute = path.resolve(filePath);
    const tmpPath = `${absolute}.tmp`;
    /** @type {Map<string, object>} */
    const users = new Map();

    let writeQueue = Promise.resolve();
    let pendingTimer = null;

    async function init() {
        await fsp.mkdir(path.dirname(absolute), { recursive: true });
        let raw;
        try {
            raw = await fsp.readFile(absolute, 'utf8');
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            // Keep the unreadable file around instead of silently overwriting it.
            const backup = `${absolute}.corrupt-${Date.now()}`;
            await fsp.rename(absolute, backup);
            console.error(`[store] ${absolute} was not valid JSON, moved to ${backup}`);
            return;
        }
        for (const record of parsed.users || []) {
            const normalized = normalizeRecord(record);
            if (normalized && normalized.username) users.set(normalized.username, normalized);
        }
    }

    function serialize() {
        return JSON.stringify({ version: 1, users: [...users.values()] }, null, 2);
    }

    async function writeNow() {
        const payload = serialize();
        await fsp.writeFile(tmpPath, payload, 'utf8');
        await fsp.rename(tmpPath, absolute);
    }

    // Coalesce bursts of writes; each flush still writes the full current state.
    function scheduleFlush() {
        if (pendingTimer) return writeQueue;
        pendingTimer = setTimeout(() => {
            pendingTimer = null;
            writeQueue = writeQueue
                .then(writeNow)
                .catch((err) => console.error('[store] failed to persist:', err.message));
        }, 50);
        if (pendingTimer.unref) pendingTimer.unref();
        return writeQueue;
    }

    async function flush() {
        if (pendingTimer) {
            clearTimeout(pendingTimer);
            pendingTimer = null;
        }
        writeQueue = writeQueue.then(writeNow);
        return writeQueue;
    }

    return {
        kind: 'json',
        init,

        async getUser(username) {
            const record = users.get(username);
            return record ? structuredClone(record) : null;
        },

        async saveUser(record) {
            const normalized = normalizeRecord(record);
            users.set(normalized.username, normalized);
            scheduleFlush();
        },

        /**
         * Read-modify-write in one indivisible step.
         *
         * The mutator MUST be synchronous — that is the whole safety argument.
         * Node runs one callback at a time, so a function containing no `await`
         * cannot be interleaved with another request's mutation.
         *
         * Returns null when the user does not exist, { ok: false } when the
         * mutator vetoes the change by returning false, otherwise { ok: true }.
         */
        async mutateUser(username, mutator) {
            const current = users.get(username);
            if (!current) return null;

            // Work on a copy so a throwing or vetoing mutator cannot leave the
            // stored record half-updated.
            const draft = structuredClone(current);
            if (mutator(draft) === false) return { ok: false, record: draft };

            users.set(username, normalizeRecord(draft));
            scheduleFlush();
            return { ok: true, record: structuredClone(users.get(username)) };
        },

        async listUsers() {
            return [...users.values()].map((r) => structuredClone(r));
        },

        async renameUser(oldUsername, newUsername) {
            const record = users.get(oldUsername);
            if (!record) return;
            users.delete(oldUsername);
            record.username = newUsername;
            users.set(newUsername, record);
            scheduleFlush();
        },

        async deleteUser(username) {
            users.delete(username);
            scheduleFlush();
        },

        flush,

        async close() {
            try {
                await flush();
            } catch (err) {
                console.error('[store] final flush failed:', err.message);
            }
            // Best effort cleanup of a leftover temp file.
            try {
                fs.unlinkSync(tmpPath);
            } catch (_) {
                /* nothing to clean up */
            }
        }
    };
}

module.exports = { createJsonStore };
