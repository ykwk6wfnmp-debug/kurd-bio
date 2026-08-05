'use strict';

const { normalizeRecord } = require('./record');

/**
 * Postgres backed store. Exposes exactly the same API as the JSON store, so
 * nothing outside this folder knows which one is in use.
 *
 * The whole user record lives in a jsonb column: the app only ever reads a
 * user by primary key or lists everyone, so a wider schema would buy nothing.
 */
// `pgModule` is injectable purely so tests can execute this file's real SQL
// against an in-memory Postgres. Production always gets the real driver.
function createPgStore(connectionString, pgModule) {
    const { Pool } = pgModule || require('pg');
    const pool = new Pool({
        connectionString,
        // Managed Postgres (Neon, Render, Supabase) requires TLS but serves a
        // certificate the default CA bundle does not cover.
        ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
        max: 5
    });

    async function init() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS kb_users (
                username   TEXT PRIMARY KEY,
                data       JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);
    }

    return {
        kind: 'postgres',
        init,

        async getUser(username) {
            const { rows } = await pool.query('SELECT data FROM kb_users WHERE username = $1', [username]);
            return rows.length ? normalizeRecord(rows[0].data) : null;
        },

        async saveUser(record) {
            const normalized = normalizeRecord(record);
            await pool.query(
                `INSERT INTO kb_users (username, data)
                 VALUES ($1, $2)
                 ON CONFLICT (username)
                 DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
                [normalized.username, normalized]
            );
        },

        /**
         * Read-modify-write in one transaction. SELECT ... FOR UPDATE holds a
         * row lock for the duration, so concurrent mutations of the same user
         * serialise instead of overwriting each other.
         *
         * The mutator MUST be synchronous — running I/O inside would hold the
         * row lock open across a network round trip.
         */
        async mutateUser(username, mutator) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const { rows } = await client.query(
                    'SELECT data FROM kb_users WHERE username = $1 FOR UPDATE',
                    [username]
                );
                if (!rows.length) {
                    await client.query('ROLLBACK');
                    return null;
                }

                const draft = normalizeRecord(rows[0].data);
                if (mutator(draft) === false) {
                    await client.query('ROLLBACK');
                    return { ok: false, record: draft };
                }

                const next = normalizeRecord(draft);
                await client.query(
                    'UPDATE kb_users SET data = $2, updated_at = now() WHERE username = $1',
                    [username, next]
                );
                await client.query('COMMIT');
                return { ok: true, record: next };
            } catch (err) {
                await client.query('ROLLBACK').catch(() => {});
                throw err;
            } finally {
                client.release();
            }
        },

        /**
         * Identifies exactly which database this process is talking to.
         * Answers "is the write going somewhere else?" without needing access
         * to the host's environment. Never exposes the password.
         */
        async describe() {
            let host = 'unknown';
            let database = 'unknown';
            try {
                const parsed = new URL(connectionString);
                host = parsed.host;
                database = parsed.pathname.replace(/^\//, '') || 'unknown';
            } catch (_) {
                /* keep the defaults */
            }

            const info = { kind: 'postgres', host, database, rows: null, schema: null };
            try {
                const { rows } = await pool.query(
                    'SELECT current_schema() AS schema, (SELECT count(*) FROM kb_users) AS n'
                );
                info.schema = rows[0].schema;
                info.rows = Number(rows[0].n);
            } catch (err) {
                info.error = err.message;
            }
            return info;
        },

        async listUsers() {
            const { rows } = await pool.query('SELECT data FROM kb_users ORDER BY created_at ASC');

            // One unreadable row must never hide all the others. Anything that
            // cannot be normalized is skipped and logged loudly rather than
            // returned as null, which would throw in every caller.
            const out = [];
            for (const row of rows) {
                const record = normalizeRecord(row.data);
                if (record && record.username) out.push(record);
                else console.error('[store] SKIPPED unreadable kb_users row:', JSON.stringify(row.data).slice(0, 200));
            }
            if (out.length !== rows.length) {
                console.error(`[store] listUsers returned ${out.length} of ${rows.length} rows`);
            }
            return out;
        },

        async renameUser(oldUsername, newUsername) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const { rows } = await client.query('SELECT data FROM kb_users WHERE username = $1 FOR UPDATE', [
                    oldUsername
                ]);
                if (!rows.length) {
                    await client.query('ROLLBACK');
                    return;
                }
                const record = normalizeRecord(rows[0].data);
                record.username = newUsername;
                await client.query(
                    'INSERT INTO kb_users (username, data) VALUES ($1, $2)',
                    [newUsername, record]
                );
                await client.query('DELETE FROM kb_users WHERE username = $1', [oldUsername]);
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK').catch(() => {});
                throw err;
            } finally {
                client.release();
            }
        },

        async deleteUser(username) {
            await pool.query('DELETE FROM kb_users WHERE username = $1', [username]);
        },

        async flush() {
            /* every write is already committed */
        },

        async close() {
            await pool.end();
        }
    };
}

module.exports = { createPgStore };
