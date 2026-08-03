# KurdBio

A "link in bio" app in Kurdish Sorani — profile page, 100 themes, admin panel.
Express + Node, no build step.

```bash
npm install
npm run dev     # http://localhost:4000
npm test        # 22 end-to-end tests
```

On first boot an admin account is created. Set `ADMIN_PASSWORD`, or read the
generated password from the startup log.

## Deploying (important)

**Set `DATABASE_URL`.** Render's free tier (and Railway's) has an ephemeral
filesystem: the JSON fallback store is wiped on every deploy, restart and sleep
cycle, so every account would be lost. A free [Neon](https://neon.tech)
Postgres is enough — the table is created automatically on boot.

Also set:

| Variable          | Why |
| ----------------- | --- |
| `SESSION_SECRET`  | Signs session cookies. Without it a random one is generated per boot, signing everyone out on each restart. |
| `DATABASE_URL`    | Postgres connection string. Without it data lives in `data/store.json`. |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Admin credentials. There is no hardcoded default. |
| `PUBLIC_BASE_URL` | Canonical origin (e.g. `https://kurdbio.onrender.com`) used to build the shareable profile link. |
| `CORS_ORIGIN`     | Only if another origin must call the API. Empty means same-origin only. |

See `.env.example`. Render settings: build `npm install`, start `npm start`,
health check path `/health`.

## Layout

```
server.js              boot: store → admin seed → listen
src/
  config.js            environment
  app.js               express wiring, security headers, error handling
  themes.js            the 100-theme catalog (single source of truth)
  seed-admin.js        seeds the admin as a normal user row with role: 'admin'
  lib/
    session.js         signed httpOnly cookie sessions, requireAuth/requireAdmin
    validation.js      every input limit and format lives here
    rate-limit.js      in-memory fixed-window limiter
    urls.js            the only place a public profile URL is built
  store/
    index.js           picks the backend
    pg-store.js        Postgres (DATABASE_URL)
    json-store.js      data/store.json, written atomically (.tmp → rename)
    record.js          user record shape + the public projection
  routes/              auth, profile, admin, pages
  views/               server-rendered HTML shells (no user data interpolated)
public/
  css/app.css          all styles
  js/                  one script per page + shared kb.js helpers
legacy/                earlier static prototype, unused
```

## Data model

One record per user, in Postgres as a `jsonb` column or as an entry in
`store.json`:

```jsonc
{
  "username": "ahmad",
  "passwordHash": "$2b$10$…",   // bcrypt
  "role": "user",                // or "admin"
  "banned": false,
  "balance": 0,
  "ownedThemes": ["theme_71"],   // VIP themes are charged once, then owned
  "sessionVersion": 1,           // bumped to invalidate existing cookies
  "profile": { "name": "", "bio": "", "avatar": "", "theme": "theme_1",
               "socials": {}, "links": [{ "id": 1, "title": "", "url": "" }] }
}
```

## URLs

- `/u/:username` — the public profile (primary).
- `/profile?user=…` — kept working, 301s to `/u/:username`.
- Both are built by `src/lib/urls.js`; nothing else constructs a share link.

## Security notes

- Identity comes from a signed httpOnly cookie. Every write endpoint reads the
  username from the session — a username in the body or query is ignored.
- Passwords are bcrypt hashed; changing a password or username bumps
  `sessionVersion`, which invalidates every cookie issued before it.
- The public profile is rendered with `createElement` + `textContent` only, and
  every URL is rejected unless it is `http:` or `https:`.
- `GET /api/public-profile/:username` returns public fields only and never
  creates a user; `GET /api/me` is the owner-only endpoint that exposes balance.
- Login and register are rate limited per IP (in-memory — needs a shared store
  if this is ever run on more than one instance).
