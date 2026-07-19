# Task-Manager Full-Stack Revamp — Design Spec

**Date:** 2026-07-20
**Branch:** `revamp-fullstack`
**Author:** Arnab Biswas (with Claude)

## 1. Goal

Revamp an old backend-only GraphQL task manager into a modern full-stack app:

- Modernize the backend (stay JavaScript / CommonJS — no TypeScript).
- Fix known security bugs and a deploy blocker.
- Add a new, polished, interactive React frontend with strong UX.
- Deploy the whole thing on Render (free tier).

Non-goals: no domain/schema redesign, no TypeScript on the backend, no unrelated refactors.

## 2. Current state (baseline)

GraphQL API only. Node + Express 4 + `apollo-server-express` **v2 (EOL)** over PostgreSQL via Knex.

Domain:

- **User** — signup/login (JWT), role USER/ADMIN, soft-delete.
- **Task** — CRUD, status TODO/IN_PROGRESS/COMPLETED, owned by a user.
- **Sub-tasks** — via `map_parent_sub_task` join table (task tree).
- Cursor pagination (base64 id), ILIKE text search, sort, soft-delete cascade, DataLoader batching, graphql-shield authorization.

Files: `server.js`, `schema/` (queryType, resolvers, dataloaders), `service/` (auth, rules, permissions), `database/` (models, util/knexfile, tables.sql).

## 3. Decisions (locked)

| Topic                 | Decision                                                            |
| --------------------- | ------------------------------------------------------------------- |
| Backend modernization | Full modernize, **stay JS/CommonJS** (no TS)                        |
| Frontend stack        | React + Vite + **TypeScript** + Tailwind + shadcn/ui                |
| GraphQL client        | Apollo Client                                                       |
| Repo layout           | Monorepo: `/server` + `/client`                                     |
| Task UX               | **Board + List toggle** (kanban drag-and-drop + list)               |
| FE features           | Auth, Task CRUD + sub-tasks, Search + pagination, Admin (read-only) |
| Admin scope           | Read-only user directory (matches current BE)                       |
| Worktree              | No — work in current checkout on branch `revamp-fullstack`          |
| Deploy target         | Render (free tier): Web Service + Static Site + managed Postgres    |

## 4. Repo layout

```
Task-Manager-GraphQL/
├── server/                 # existing backend moved here (CommonJS JS)
│   ├── package.json
│   ├── server.js
│   ├── schema/  service/  database/
│   ├── migrations/         # NEW — knex migrations
│   └── seeds/              # NEW — knex seed (first admin)
├── client/                 # NEW — Vite React TS app
│   ├── package.json
│   └── src/
├── render.yaml             # NEW — IaC: api + static site + postgres
├── docs/
└── README.md               # documents both apps + deploy
```

## 5. Backend modernization (stay JS / CommonJS)

- **GraphQL server:** replace `apollo-server-express` v2 with **`@apollo/server` v5** + `expressMiddleware`. Startup becomes async (`await server.start()`), then mount middleware.
- **Package bumps:** Express 4 → 5; `jsonwebtoken` 8 → 9; latest `knex`, `pg`, `graphql`, `dataloader`, `lodash`, `validator`, `cors`, `dotenv`.
- **`gql` tag:** now imported from `graphql-tag` (no longer from apollo-server-express); `makeExecutableSchema` from `@graphql-tools/schema`.
- **Password hashing:** keep `bcryptjs` (pure JS, no native build → painless on Render). Argon2 noted as an optional future upgrade.
- **dotenv:** load once at the entry point (`server.js`). Delete the buggy per-file `require('dotEnv')` calls (wrong case — the deploy blocker on Linux).
- **Coding norms:** apply throughout — `const` everywhere, block statements with `{}`, model functions build a `const query` then `return await query`, lodash for transforms, `Promise.all`/object for independent async, single-param `(data)` signatures destructured in the body, meaningful "why" comments only.

## 6. Security fixes (bundled into the migration)

1. **SQL injection** — `database/models/user.js#getUsers` interpolates `searchText` into `andWhereRaw`. Replace with parameterized `whereILike` (as the tasks model already does).
2. **Privilege escalation** — remove `role` from `SignUpInput`; force every signup to `USER`. First ADMIN created via a knex seed (email/password from env).
3. **N+1** — `subTasks` resolver calls `getSubTaskIds` directly; switch it to the `batchSubTasksId` DataLoader. Fix that loader — it currently `find`s a single row per parent; change to `_.groupBy` so all sub-tasks return.
4. **JWT** — reduce expiry 84d → 7d; throw at startup if `JWT_SECRET_KEY` is missing.
5. **CORS** — restrict to the frontend origin in production (env-driven `CLIENT_ORIGIN`); permissive in dev.
6. **Root route** — replace the hardcoded-`localhost` HTML form with a JSON health check (`GET /` → `{ status: 'ok' }`).

No other change to the GraphQL API surface (only the `role` signup field is dropped).

## 7. Database / migrations

- Convert `database/tables.sql` into **knex migrations**: `user`, `task`, `map_parent_sub_task` (enums `user_role_enum`, `status_enum`; FKs; soft-delete columns).
- **Seed:** one ADMIN user; credentials from env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), password bcrypt-hashed.
- **knexfile:** add a `production` env using `connection: DATABASE_URL` + `ssl: { rejectUnauthorized: false }` (Render Postgres requires SSL). Env selected by `NODE_ENV`. Keep `development` as-is.
- Migrations run on Render deploy (predeploy: `knex migrate:latest`).

### Storage estimate (free-tier sanity check)

Per-row (with indexes): user ≈ 228 B, task ≈ 118 B, subtask link ≈ 70 B.
100 users × 1000 tasks = 100k tasks ≈ **13–16 MB** total (incl. ~25% subtask links + ~15% overhead). Free-tier cap is 1 GB — ~60× headroom. Free Postgres expires after 30 days (accepted).

## 8. Frontend (`/client`)

Stack: React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Apollo Client + react-router + @dnd-kit.

### Auth

- JWT stored in `localStorage`; Apollo `authLink` injects `Authorization: Bearer <token>`.
- Protected-route guard; redirect unauthenticated users to `/login`.
- Decode role from token (or `me`-style `user` query) to gate the admin route.
- Logout clears token + Apollo cache.

### Routes

- Public: `/login`, `/signup`.
- Protected: `/board` (main), `/admin` (admin-only).

### Tasks — Board + List toggle

- **Kanban:** three columns TODO / IN_PROGRESS / COMPLETED. Drag a card between columns via @dnd-kit → `updateTask` mutation with optimistic UI.
- **List:** grouped by status, filter chips, inline status change.
- **Sub-tasks:** expandable/nested under a parent card; create a sub-task from a task (uses `parentTaskId`).
- **CRUD:** create / edit / delete task via dialog (shadcn Dialog); delete confirms.

### Search + pagination

- Debounced search box → `userTasks(filter, cursor)`.
- "Load more" / infinite scroll driven by `pageInfo.nextPageCursor`.

### Admin (read-only)

- `/admin`, visible only to ADMIN. Table of all users (via admin-gated `users` query) with task counts, search, pagination. No mutations.

### UX polish

- Light/dark theme toggle.
- Toasts (success/error), skeleton loaders, empty states.
- Responsive (mobile → desktop), accessible dialogs/keyboard nav.

### Config

- `VITE_GRAPHQL_URL` env → API endpoint. Local defaults to `http://localhost:4000/graphql`.

## 9. Deployment (Render, via `render.yaml`)

- **PostgreSQL** (Render managed, free) → provides `DATABASE_URL`.
- **Web Service** (`/server`): build `npm install`; predeploy `npx knex migrate:latest`; start `node server.js`. Env: `DATABASE_URL`, `JWT_SECRET_KEY`, `NODE_ENV=production`, `CLIENT_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PORT` (Render-provided).
- **Static Site** (`/client`): build `npm install && npm run build`; publish `client/dist`. Env: `VITE_GRAPHQL_URL` = deployed API URL. SPA rewrite rule → `index.html`.
- `render.yaml` blueprint defines all three so deploy is reproducible.

## 10. Verification

- **Backend:** after migration, smoke-test every query/mutation via GraphQL — auth (signup/login, JWT), tasks CRUD + sub-tasks, search + pagination, admin gating; confirm the injection fix and role lock.
- **Frontend:** manual walkthrough of each flow; drive it in a real browser (Chrome tools) before declaring done.
- **Coding-norms self-review:** run a review pass (block statements, `const`, model `query` pattern, lodash, helper extraction, comments) before handoff; report what was checked/found/fixed.
- **Deploy:** verify all three Render services build, migrate, and the FE talks to the API in production.

## 11. Build order (high level — detailed plan follows)

1. Restructure repo into `/server` (move existing code, fix require paths).
2. Backend: package bumps + Apollo v5 rewrite + Express 5.
3. Backend: security fixes + N+1 fix.
4. DB: knex migrations + admin seed + production knexfile.
5. Scaffold `/client` (Vite + Tailwind + shadcn + Apollo Client).
6. FE: auth flow + routing + guards.
7. FE: task board + list + sub-tasks + CRUD.
8. FE: search + pagination.
9. FE: admin read-only view.
10. FE: UX polish (theme, toasts, skeletons, responsive).
11. `render.yaml` + README + deploy.
12. Verification + coding-norms self-review.
