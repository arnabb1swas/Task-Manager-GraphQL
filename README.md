# Task Manager — Full-Stack GraphQL

A task manager with a modern GraphQL API and a polished React SPA. Users sign up, manage tasks across a Kanban board (drag-and-drop) or list view, nest sub-tasks, search + paginate, and admins get a read-only user directory.

- **Server** (`/server`) — Node + Express 5, `@apollo/server` v5, GraphQL over PostgreSQL via Knex. CommonJS JavaScript.
- **Client** (`/client`) — React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui + Apollo Client v4.
- **Database** — PostgreSQL (Neon serverless in production).
- **Deploy** — Render (Web Service + Static Site) via `render.yaml`; Neon for Postgres.

## Repo layout

```
.
├── server/                 # GraphQL API (CommonJS JS)
│   ├── server.js           # @apollo/server v5 + expressMiddleware (Express 5)
│   ├── schema/             # queryType (SDL), resolvers, dataloaders
│   ├── service/            # auth (JWT/bcrypt), graphql-shield rules + permissions
│   ├── database/
│   │   ├── util/           # knexfile (dev + production), db connection
│   │   ├── models/         # user + task query builders
│   │   ├── migrations/     # knex schema migrations
│   │   └── seeds/          # first-admin seed
│   └── __tests__/          # targeted security tests
├── client/                 # React SPA (TypeScript)
│   └── src/
│       ├── apollo/         # Apollo Client (auth link + pagination cache policies)
│       ├── auth/           # AuthContext + ProtectedRoute
│       ├── graphql/        # queries + mutations
│       ├── hooks/          # debounce, optimistic status update
│       ├── components/     # board/* + ui/* (shadcn) + ModeToggle + theme-provider
│       └── pages/          # Login, Signup, Board, Admin
├── render.yaml             # Render blueprint (api + static web)
└── docs/                   # design spec + implementation plan
```

## Features

- **Auth** — signup / login with JWT (7-day expiry). Role (USER/ADMIN) decoded from the token; role is never client-supplied at signup.
- **Tasks** — CRUD via dialog, status TODO / IN_PROGRESS / COMPLETED, drag-and-drop between Kanban columns with optimistic UI, list view with inline status change, expandable sub-tasks.
- **Search + pagination** — debounced text search, cursor-based "load more" (merged client-side via Apollo field policies).
- **Admin** — read-only directory of all users with task counts, search + pagination (admin-only route).
- **UX** — light/dark theme (persisted), toasts, first-load skeletons, empty states, responsive.

## Local development

Prerequisites: Node ≥ 20, a local PostgreSQL (or a Neon connection string).

### Server

```bash
cd server
npm install
cp example.env .env        # then fill in the values (see table below)
npm run migrate            # create tables/enums
npm run seed               # create the first admin (needs ADMIN_EMAIL/ADMIN_PASSWORD)
npm run dev                # http://localhost:4000/graphql  (GET / = health check)
npm test                   # security unit tests
```

To run migrations/seed against Neon locally, set `DATABASE_URL` and prefix with `NODE_ENV=production` (selects the production knex config with SSL).

### Client

```bash
cd client
npm install
# client/.env defaults VITE_GRAPHQL_URL to http://localhost:4000/graphql
npm run dev                # http://localhost:5173
npm run build              # type-check + production build
```

## Environment variables

### Server (`server/.env`)

| Var | Purpose |
| --- | --- |
| `PORT` | API port (default 4000; Render provides this) |
| `NODE_ENV` | `development` or `production` (selects knex config) |
| `JWT_SECRET_KEY` | **Required** — server refuses to boot without it |
| `PG_DB` / `PG_USER` / `PG_PASSWORD` | Local dev Postgres connection |
| `DATABASE_URL` | Production connection string (Neon pooled) |
| `CLIENT_ORIGIN` | Allowed CORS origin in production (the web URL) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credentials for the seeded first admin |

### Client (`client/.env`)

| Var | Purpose |
| --- | --- |
| `VITE_GRAPHQL_URL` | GraphQL endpoint (defaults to `http://localhost:4000/graphql`) |

## Deployment (Render + Neon)

1. **Create the Neon database** (console, free tier). Copy the **pooled** connection string (host contains `-pooler`, `?sslmode=require`).
2. **Create a Render Blueprint** from `render.yaml` — provisions `task-manager-api` (Web Service) and `task-manager-web` (Static Site).
3. **Set the `sync: false` vars** on the api service in the Render dashboard: `DATABASE_URL` (Neon pooled string), `ADMIN_EMAIL`, `ADMIN_PASSWORD`. (`JWT_SECRET_KEY` is auto-generated.)
4. **Wire the cross-referenced URLs** after the first deploy assigns them:
   - api `CLIENT_ORIGIN` = the web service URL.
   - web `VITE_GRAPHQL_URL` = the api service URL + `/graphql`.
5. The api service runs `npm run migrate && npm run seed` as its pre-deploy step (the admin seed is idempotent).

## Security notes (fixed in this revamp)

- Parameterized user search (no SQL injection via `searchText`).
- `role` removed from signup input — self-registration as ADMIN is impossible; the first admin comes from the seed.
- JWT expiry reduced to 7 days; the server fails fast if `JWT_SECRET_KEY` is missing.
- Sub-task DataLoader batches correctly (grouped, no N+1 / missing sub-tasks).
- CORS locked to `CLIENT_ORIGIN` in production.
