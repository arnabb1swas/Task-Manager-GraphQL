# Task-Manager Full-Stack Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the backend-only GraphQL task manager (fix security + deploy blockers), add a polished React frontend, deploy the whole thing on Render.

**Architecture:** Monorepo — `/server` (existing GraphQL API, modernized, stays CommonJS JS) + `/client` (new Vite React TS SPA). API served by `@apollo/server` v5 on Express 5 over Render Postgres via Knex. FE talks to it with Apollo Client.

**Tech Stack:** Node + Express 5, `@apollo/server` v5, `graphql`, Knex + `pg`, `bcryptjs`, `jsonwebtoken` 9, `graphql-shield`, `dataloader`, `lodash`, `validator` (server); React 19 + Vite + TypeScript + Tailwind + shadcn/ui + Apollo Client + react-router + @dnd-kit (client); Render (web service + static site + managed Postgres).

## Global Constraints

- **Server language:** CommonJS JavaScript. **No TypeScript on the server.** Client is TypeScript.
- **Coding norms — applied WHILE writing every task, not audited afterward.** The Task 15 review only _confirms_; it is not the first time norms are applied. Load `~/.claude/CLAUDE.md` "Personal Coding Norms" at the start of execution and keep them in force for the whole run.
  - **Server (JS) — full norm set:** `const` everywhere (`var` forbidden, `let` only for genuine reassignment); block statements with `{}` (no one-liners); ternary only for a single simple condition (never nested); model functions build a `const query = db(...)...` then `return await query`; prefer lodash for transforms (collapse chains, fewer loops); independent async batched via `Promise.all` / object; single-param `(data)` signatures destructured inside the body; minimal helpers with `_` prefix per the extraction thresholds; meaningful "why" comments only; blank lines between logical chunks.
  - **Client (TS) — readability subset:** `const`/block statements/single-condition-ternary/helper-extraction thresholds/why-comments/blank-lines apply. (Knex `query` pattern and mandatory-lodash don't apply to React/TS.)
  - **Audit before changing existing code:** before editing any shared server signature/schema field, search usages with semble (`mcp__semble__search`) so no caller breaks.
- **No per-step git commits.** Each task ends with a verification checkpoint. A single commit is made at the very end (Task 15) after the user reviews the full diff. No `--amend`, no force push.
- **Node version:** run `nvm use` (Node ≥ 20) before any server npm work.
- **Package versions:** install latest stable majors — `@apollo/server@^5`, `express@^5`, `graphql@^16`, `jsonwebtoken@^9`, `knex@^3`, `pg@^8`, `dataloader@^2`. Client: `react@^19`, `@apollo/client@^3`, `react-router-dom@^7`, `@dnd-kit/core` + `@dnd-kit/sortable`.
- **No GraphQL API surface change** except dropping the `role` field from `SignUpInput`.
- **Verification, not assertion:** every checkpoint runs a real command / browser check and confirms output before ticking the box.

---

## File Structure

```
Task-Manager-GraphQL/
├── server/                         # moved from repo root
│   ├── package.json
│   ├── server.js                   # rewritten for @apollo/server v5 + Express 5
│   ├── schema/
│   │   ├── queryType/{index,user,task}.js
│   │   ├── resolvers/{index,user,task}.js
│   │   └── dataloaders/{index,user,task}.js
│   ├── service/{auth,rules,permissions}.js
│   ├── database/
│   │   ├── util/{index,knexfile}.js
│   │   ├── models/{index,user,task}.js
│   │   ├── migrations/             # NEW
│   │   │   └── 20260720000000_init.js
│   │   ├── seeds/                  # NEW
│   │   │   └── 01_admin.js
│   │   └── tables.sql              # kept for reference
│   ├── __tests__/                  # NEW — targeted security tests
│   └── .env / example.env
├── client/                         # NEW Vite React TS app
│   └── src/
│       ├── main.tsx  App.tsx
│       ├── apollo/client.ts
│       ├── auth/{AuthContext.tsx,ProtectedRoute.tsx}
│       ├── graphql/{queries.ts,mutations.ts}
│       ├── pages/{Login,Signup,Board,Admin}.tsx
│       ├── components/board/{KanbanBoard,ListView,TaskCard,TaskDialog,SubTaskList}.tsx
│       ├── components/ui/          # shadcn generated
│       └── lib/utils.ts
├── render.yaml                     # NEW
├── README.md                       # rewritten
└── docs/superpowers/{specs,plans}/
```

---

## PHASE A — Backend

### Task 1: Restructure repo into `/server`

**Files:**

- Move: everything currently at repo root (`server.js`, `schema/`, `service/`, `database/`, `package.json`, `package-lock.json`, `example.env`, `.env` if present) → `server/`.
- Keep at root: `.git`, `.gitignore`, `.claude`, `docs/`, `README.md`.

- [ ] **Step 1: Move backend files** (use `git mv` to preserve history)

```bash
cd /Users/arnab/Developer/Task-Manager-GraphQL
mkdir -p server
git mv server.js schema service database package.json package-lock.json example.env server/
# .env is gitignored — move manually if it exists
[ -f .env ] && mv .env server/.env || true
```

- [ ] **Step 2: Verify no root-relative path breaks**

All server `require` calls are already relative (`./schema/...`), so moving the whole tree keeps them valid. Confirm:

```bash
grep -rn "require('\.\./\.\./\.\./" server/ || echo "no over-deep relatives — OK"
```

- [ ] **Step 3: Checkpoint** — `ls server/` shows `server.js schema service database package.json`. Structure intact.

---

### Task 2: Modernize server dependencies + Apollo v5 / Express 5 rewrite

**Files:**

- Modify: `server/package.json`
- Modify: `server/server.js`
- Modify: `server/schema/queryType/index.js`, `server/schema/queryType/user.js`, `server/schema/queryType/task.js` (swap `gql` import source)

**Interfaces:**

- Produces: an Express app exposing `POST /graphql` (Apollo v5 via `expressMiddleware`) and `GET /` health check; context `{ jwtUser, loaders }` unchanged so resolvers need no change.

- [ ] **Step 1: Rewrite `server/package.json` dependencies**

```json
{
  "name": "task-manager-server",
  "version": "2.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "migrate": "knex migrate:latest --knexfile database/util/knexfile.js",
    "seed": "knex seed:run --knexfile database/util/knexfile.js",
    "test": "node --test __tests__/"
  },
  "dependencies": {
    "@apollo/server": "^5.0.0",
    "@as-integrations/express5": "^1.0.0",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "dataloader": "^2.2.3",
    "dotenv": "^17.0.0",
    "express": "^5.1.0",
    "graphql": "^16.9.0",
    "graphql-middleware": "^6.1.35",
    "graphql-shield": "^7.6.5",
    "graphql-tag": "^2.12.6",
    "@graphql-tools/schema": "^10.0.0",
    "jsonwebtoken": "^9.0.2",
    "knex": "^3.1.0",
    "lodash": "^4.17.21",
    "pg": "^8.13.0",
    "validator": "^13.12.0"
  }
}
```

> Note: `@apollo/server` v5 needs the Express 5 integration package `@as-integrations/express5`. `bcryptjs` v3 API is unchanged (`hash`, `compare`).

- [ ] **Step 2: Install**

```bash
cd server && nvm use && rm -f package-lock.json && npm install
```

Expected: installs without peer-dep errors.

- [ ] **Step 3: Swap `gql` import source in all three queryType files**

In `server/schema/queryType/index.js`, `user.js`, `task.js` replace:

```js
const { gql } = require("apollo-server-express");
```

with:

```js
const gql = require("graphql-tag");
```

(No other change to the schema strings.)

- [ ] **Step 4: Rewrite `server/server.js`**

```js
require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { applyMiddleware } = require("graphql-middleware");

const typeDefs = require("./schema/queryType");
const loaders = require("./schema/dataloaders");
const resolvers = require("./schema/resolvers");
const { verifyUserAuth } = require("./service/auth");
const { permissions } = require("./service/permissions");

// Fail fast: a missing secret must not silently produce unverifiable tokens.
if (!process.env.JWT_SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY is required");
}

const PORT = process.env.PORT || 4000;

// Prod locks CORS to the deployed frontend; dev stays open for local tooling.
const corsOptions =
  process.env.NODE_ENV === "production"
    ? { origin: process.env.CLIENT_ORIGIN, credentials: true }
    : {};

const startServer = async () => {
  const app = express();

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const schemaWithPermissions = applyMiddleware(schema, permissions);

  const apolloServer = new ApolloServer({ schema: schemaWithPermissions });
  await apolloServer.start();

  app.get("/", (req, res) => {
    res.json({ status: "ok", service: "task-manager-graphql" });
  });

  app.use(
    "/graphql",
    cors(corsOptions),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const jwtUser = await verifyUserAuth(req);
        return { jwtUser, loaders };
      },
    }),
  );

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🚀 GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
};

startServer();
```

- [ ] **Step 5: Checkpoint** — with a local Postgres + `.env` set, `npm run dev` boots without error and `curl localhost:4000/` returns `{"status":"ok",...}`. (DB queries not exercised yet — see Task 5.)

---

### Task 3: Fix `dotenv` case bug + centralize env loading

**Files:**

- Modify: `server/service/auth.js:1`
- Modify: `server/database/util/knexfile.js` (dotenv already lowercase there — verify)

- [ ] **Step 1: Fix the wrong-case require** in `server/service/auth.js`

Replace line 1:

```js
const dotEnv = require("dotEnv");
```

Delete it and the `dotEnv.config();` call entirely — env is now loaded once in `server.js`. Keep the `bcrypt`/`jwt` requires. Result top of file:

```js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
```

- [ ] **Step 2: Grep for any other stray dotenv loads**

```bash
grep -rn "require('dot[eE]nv')" server/
```

Expected hits: only `server/server.js` and `server/database/util/knexfile.js` (both lowercase `dotenv`). Knexfile keeps its own `require('dotenv').config()` because knex CLI loads it standalone.

- [ ] **Step 3: Checkpoint** — server still boots (`npm run dev`), no `Cannot find module 'dotEnv'` on a case-sensitive check:

```bash
node -e "require('./server/service/auth.js'); console.log('auth loads OK')"
```

Expected: `auth loads OK`.

---

### Task 4: Security fixes — SQL injection, role lock, JWT, N+1

**Files:**

- Modify: `server/database/models/user.js` (`getUsers`)
- Modify: `server/schema/queryType/user.js` (`SignUpInput`)
- Modify: `server/schema/resolvers/user.js` (`signUp`)
- Modify: `server/service/auth.js` (`createAuthToken` expiry)
- Modify: `server/schema/dataloaders/task.js` (`batchSubTasksId`)
- Modify: `server/schema/resolvers/task.js` (`subTasks` resolver)
- Test: `server/__tests__/security.test.js`

**Interfaces:**

- Produces: `batchSubTasksId(keys)` returns `Array<Array<mapRow>>` grouped by `fk_parent_task_id` (one array per key, `[]` when none) — consumed by the `subTasks` resolver via `batchSubTasksId.load(parentId)`.

- [ ] **Step 1: Fix SQL injection in `getUsers`**

In `server/database/models/user.js`, replace the raw interpolation:

```js
if (searchText) {
  query.andWhereRaw(
    `(name ILIKE '%${searchText}%' OR email ILIKE '%${searchText}%')`,
  );
}
```

with parameterized clauses (Knex escapes bindings):

```js
if (searchText) {
  query.andWhere((builder) => {
    builder
      .whereILike("name", `%${searchText}%`)
      .orWhereILike("email", `%${searchText}%`);
  });
}
```

- [ ] **Step 2: Drop `role` from `SignUpInput`**

In `server/schema/queryType/user.js`, change:

```graphql
input SignUpInput {
  name: String!
  email: String!
  password: String!
  role: USER_ROLE_ENUM!
}
```

to (remove `role`):

```graphql
input SignUpInput {
  name: String!
  email: String!
  password: String!
}
```

- [ ] **Step 3: Force `USER` role in the `signUp` resolver**

In `server/schema/resolvers/user.js`, change the destructure + `addUser` call so `role` is hard-coded, never taken from input:

```js
const {
  input: { name, email, password },
} = args;

const user = await getUserByEmail({ email });
if (user) {
  throw new Error("EMAIL ALREADY EXIST");
}

const hashedPassword = await hashPassword(password);

// Role is never client-supplied — prevents self-registering as ADMIN.
const newUser = await addUser({
  name,
  email,
  password: hashedPassword,
  role: "USER",
});
```

- [ ] **Step 4: Shorten JWT expiry**

In `server/service/auth.js`, `createAuthToken`:

```js
return jwt.sign(data, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });
```

- [ ] **Step 5: Fix `batchSubTasksId` to group (not `find`)**

In `server/schema/dataloaders/task.js`, replace `batchSubTasksId`:

```js
module.exports.batchSubTasksId = async (keys) => {
  try {
    keys = keys.map(Number);
    const subTaskRows = await getBatchSubTasksId({ keys });

    // Group so every sub-task of a parent is returned, not just the first.
    const grouped = _.groupBy(subTaskRows, (row) => row.fk_parent_task_id);

    return keys.map((key) => grouped[key] || []);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
```

- [ ] **Step 6: Use the DataLoader in the `subTasks` resolver**

In `server/schema/resolvers/task.js`, replace the direct `getSubTaskIds` call inside `Task.subTasks`:

```js
subTasks: async (parent, args, context) => {
    try {
        const { id: parentTaskId } = parent;
        const { loaders: { batchTask, batchSubTasksId } } = context;
        let tasks = [];

        const subTaskRows = await batchSubTasksId.load(parentTaskId);
        if (!_.isEmpty(subTaskRows)) {
            const taskIds = _.map(subTaskRows, row => row.fk_sub_task_id);
            tasks = await batchTask.loadMany(taskIds);
        }

        return tasks;
    } catch (error) {
        console.log(error);
        throw error;
    }
},
```

Remove the now-unused `getSubTaskIds` import from that file's require block if nothing else uses it (grep first).

- [ ] **Step 7: Write targeted tests** in `server/__tests__/security.test.js` (Node built-in test runner, no DB — pure logic)

```js
const { test } = require("node:test");
const assert = require("node:assert");
const _ = require("lodash");

// Mirrors the batchSubTasksId grouping contract.
test("batchSubTasksId groups all sub-tasks per parent, [] when none", () => {
  const rows = [
    { fk_parent_task_id: 1, fk_sub_task_id: 10 },
    { fk_parent_task_id: 1, fk_sub_task_id: 11 },
    { fk_parent_task_id: 2, fk_sub_task_id: 20 },
  ];
  const keys = [1, 2, 3];
  const grouped = _.groupBy(rows, (r) => r.fk_parent_task_id);
  const result = keys.map((k) => grouped[k] || []);

  assert.strictEqual(result[0].length, 2);
  assert.strictEqual(result[1].length, 1);
  assert.deepStrictEqual(result[2], []);
});

// SignUpInput must not expose role.
test("SignUpInput SDL does not accept role", () => {
  const sdl = require("fs").readFileSync(
    __dirname + "/../schema/queryType/user.js",
    "utf8",
  );
  const signUpBlock = sdl.slice(
    sdl.indexOf("input SignUpInput"),
    sdl.indexOf("input LoginInput"),
  );
  assert.ok(
    !/\brole\b/.test(signUpBlock),
    "role must be removed from SignUpInput",
  );
});
```

- [ ] **Step 8: Run tests**

```bash
cd server && node --test __tests__/
```

Expected: 2 tests pass.

- [ ] **Step 9: Checkpoint** — tests green; grep confirms no `andWhereRaw` with template interpolation remains:

```bash
grep -rn "andWhereRaw" server/database/ || echo "no raw interpolation — OK"
```

---

### Task 5: Knex migrations, admin seed, production knexfile

**Files:**

- Create: `server/database/migrations/20260720000000_init.js`
- Create: `server/database/seeds/01_admin.js`
- Modify: `server/database/util/knexfile.js`
- Modify: `server/example.env`

**Interfaces:**

- Produces: `knex migrate:latest` creates `user`, `task`, `map_parent_sub_task` + enums; `knex seed:run` inserts one ADMIN from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

- [ ] **Step 1: Add `production` env to `server/database/util/knexfile.js`**

```js
const dotEnv = require("dotenv");
dotEnv.config();

const migrations = { directory: "../migrations", tableName: "knex_migrations" };
const seeds = { directory: "../seeds" };

module.exports = {
  development: {
    client: "postgresql",
    connection: {
      database: process.env.PG_DB,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
    },
    pool: { min: 2, max: 10 },
    migrations,
    seeds,
  },

  production: {
    client: "postgresql",
    // Render provides a single connection string; SSL is required.
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 10 },
    migrations,
    seeds,
  },
};
```

> The migration/seed `directory` paths are relative to the knexfile location (`database/util/`), hence `../migrations`.

- [ ] **Step 2: Make `database/util/index.js` env-aware**

```js
const knex = require("knex");
const knexfile = require("./knexfile");

const env =
  process.env.NODE_ENV === "production" ? "production" : "development";

module.exports.db = knex(knexfile[env]);
```

- [ ] **Step 3: Create migration `server/database/migrations/20260720000000_init.js`**

```js
exports.up = async (knex) => {
  await knex.raw(`CREATE TYPE user_role_enum AS ENUM ('USER','ADMIN')`);
  await knex.raw(
    `CREATE TYPE status_enum AS ENUM ('TODO','IN_PROGRESS','COMPLETED')`,
  );

  await knex.schema.createTable("user", (table) => {
    table.increments("id").primary();
    table.text("name").notNullable();
    table.text("email").notNullable().unique();
    table.text("password").notNullable();
    table.specificType("role", "user_role_enum").defaultTo("USER");
    table
      .timestamp("created_at", { useTz: false })
      .defaultTo(knex.raw("CLOCK_TIMESTAMP()"));
    table
      .timestamp("updated_at", { useTz: false })
      .defaultTo(knex.raw("CLOCK_TIMESTAMP()"));
    table.timestamp("deleted_at", { useTz: false }).defaultTo(null);
  });

  await knex.schema.createTable("task", (table) => {
    table.increments("id").primary();
    table.text("title").notNullable();
    table.specificType("task_status", "status_enum").defaultTo("TODO");
    table
      .integer("fk_user_id")
      .notNullable()
      .references("id")
      .inTable("user")
      .onDelete("CASCADE");
    table
      .timestamp("created_at", { useTz: false })
      .defaultTo(knex.raw("CLOCK_TIMESTAMP()"));
    table
      .timestamp("updated_at", { useTz: false })
      .defaultTo(knex.raw("CLOCK_TIMESTAMP()"));
    table.timestamp("deleted_at", { useTz: false }).defaultTo(null);
  });

  await knex.schema.createTable("map_parent_sub_task", (table) => {
    table.increments("id").primary();
    table
      .integer("fk_parent_task_id")
      .notNullable()
      .references("id")
      .inTable("task")
      .onDelete("CASCADE");
    table
      .integer("fk_sub_task_id")
      .notNullable()
      .references("id")
      .inTable("task")
      .onDelete("CASCADE");
    table.timestamp("deleted_at", { useTz: false }).defaultTo(null);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists("map_parent_sub_task");
  await knex.schema.dropTableIfExists("task");
  await knex.schema.dropTableIfExists("user");
  await knex.raw("DROP TYPE IF EXISTS status_enum");
  await knex.raw("DROP TYPE IF EXISTS user_role_enum");
};
```

> Table name `user` is reserved-ish in Postgres; Knex quotes identifiers so `"user"` works, matching the existing `public.user` references in the models.

- [ ] **Step 4: Create seed `server/database/seeds/01_admin.js`**

```js
const bcrypt = require("bcryptjs");

exports.seed = async (knex) => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the admin",
    );
  }

  const existing = await knex("user").where({ email }).first();
  if (existing) {
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  await knex("user").insert({
    name: "Admin",
    email,
    password: hashed,
    role: "ADMIN",
  });
};
```

- [ ] **Step 5: Update `server/example.env`**

```
PORT=4000
NODE_ENV=development
JWT_SECRET_KEY=
# Local dev Postgres
PG_DB=
PG_USER=
PG_PASSWORD=
# Production (Render injects DATABASE_URL)
DATABASE_URL=
# Frontend origin for CORS in production
CLIENT_ORIGIN=
# Admin seed
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

- [ ] **Step 6: Checkpoint (local Postgres)** — with local `.env` filled:

```bash
cd server && npm run migrate && ADMIN_EMAIL=a@a.com ADMIN_PASSWORD=secret123 npm run seed
```

Expected: 1 migration batch runs; seed inserts admin. Verify:

```bash
node -e "require('dotenv').config();const {db}=require('./database/util');db('user').where({role:'ADMIN'}).first().then(r=>{console.log(r?.email);return db.destroy()})"
```

Expected: prints the admin email.

---

### Task 6: Backend end-to-end smoke test

**Files:** none (verification only).

- [ ] **Step 1: Boot server** — `cd server && npm run dev`.

- [ ] **Step 2: Sign up + login via curl**

```bash
curl -s localhost:4000/graphql -H 'content-type: application/json' \
  -d '{"query":"mutation{ signUp(input:{name:\"T\",email:\"t@t.com\",password:\"pass1234\"}){ token user{ id email } } }"}'
```

Expected: returns a `token` and user; role is not requestable.

- [ ] **Step 3: Create a task + sub-task, query board**

Using the token from Step 2 as `Authorization: Bearer <token>`, run `createTask` (parent), then `createTask` with `parentTaskId`, then query `userTasks(filter:{hasDeleted:false,sortBy:ASC,limit:10}){ taskFeed{ id title subTasks{ id title } } pageInfo{ hasNextPage nextPageCursor } }`. Expected: parent shows the sub-task nested; pagination fields present.

- [ ] **Step 4: Checkpoint** — auth, task CRUD, sub-task nesting, pagination all return correct data. No errors in server console.

---

## PHASE B — Frontend

### Task 7: Scaffold `/client` (Vite + Tailwind + shadcn + Apollo Client)

**Files:**

- Create: `client/` (Vite React-TS template)
- Create: `client/src/apollo/client.ts`, `client/.env`, `client/src/lib/utils.ts`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Scaffold Vite app**

```bash
cd /Users/arnab/Developer/Task-Manager-GraphQL
npm create vite@latest client -- --template react-ts
cd client && npm install
```

- [ ] **Step 2: Add Tailwind + deps**

```bash
npm install -D tailwindcss @tailwindcss/postcss postcss autoprefixer
npm install @apollo/client graphql react-router-dom @dnd-kit/core @dnd-kit/sortable
```

Configure Tailwind per current docs (v4 uses `@import "tailwindcss";` in `src/index.css` + `@tailwindcss/postcss` in `postcss.config.js`).

- [ ] **Step 3: Init shadcn/ui**

```bash
npx shadcn@latest init
npx shadcn@latest add button input dialog card badge dropdown-menu sonner skeleton table tabs
```

(Answer prompts: TypeScript yes, style default, CSS variables yes.)

- [ ] **Step 4: Create `client/src/apollo/client.ts`**

```ts
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:4000/graphql",
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

- [ ] **Step 5: Create `client/.env`**

```
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

- [ ] **Step 6: Wrap app** in `client/src/main.tsx` with `<ApolloProvider client={apolloClient}>` and `<BrowserRouter>`.

- [ ] **Step 7: Checkpoint** — `npm run dev` serves the Vite app on :5173 with a Tailwind-styled placeholder; no console errors.

---

### Task 8: GraphQL operations module

**Files:**

- Create: `client/src/graphql/queries.ts`, `client/src/graphql/mutations.ts`

- [ ] **Step 1: `queries.ts`** — `gql` documents for `user` (me), `userTasks(filter,cursor)`, `users(filter,cursor)` (admin). Include `subTasks { id title taskStatus }` on tasks and `pageInfo { hasNextPage nextPageCursor }`.

- [ ] **Step 2: `mutations.ts`** — `signUp`, `logIn`, `createTask`, `updateTask`, `deleteTask`. Each returns the fields the cache needs (`id title taskStatus`).

- [ ] **Step 3: Checkpoint** — TypeScript compiles (`npm run build` type-check passes) with the documents imported into a temp component.

---

### Task 9: Auth flow (context, routes, login, signup)

**Files:**

- Create: `client/src/auth/AuthContext.tsx`, `client/src/auth/ProtectedRoute.tsx`
- Create: `client/src/pages/Login.tsx`, `client/src/pages/Signup.tsx`
- Modify: `client/src/App.tsx` (routes)

**Interfaces:**

- Produces: `useAuth()` → `{ user, role, login(token), logout() }`; `<ProtectedRoute requireAdmin?>` guarding children.

- [ ] **Step 1: `AuthContext.tsx`** — reads token from `localStorage`, decodes payload (`id`, `role`) by base64-decoding the JWT middle segment (no verification needed client-side; server enforces). Exposes `login`/`logout` (logout clears token + `apolloClient.clearStore()`).

- [ ] **Step 2: `ProtectedRoute.tsx`** — redirects to `/login` when no token; when `requireAdmin` and role !== 'ADMIN', redirect to `/board`.

- [ ] **Step 3: `Login.tsx` / `Signup.tsx`** — shadcn Card + Input + Button forms. On submit run `logIn`/`signUp` mutation, store token via `useAuth().login`, navigate to `/board`. Show error toast (sonner) on failure.

- [ ] **Step 4: `App.tsx` routes** — `/login`, `/signup` public; `/board`, `/admin` (admin) wrapped in `ProtectedRoute`. Default redirect `/` → `/board`.

- [ ] **Step 5: Checkpoint (browser)** — sign up a new user → lands on `/board`; refresh keeps session; logout returns to `/login`; visiting `/admin` as USER redirects to `/board`. Verify via Chrome tools against the running server.

---

### Task 10: Task board — Kanban + List toggle + sub-tasks

**Files:**

- Create: `client/src/pages/Board.tsx`
- Create: `client/src/components/board/{KanbanBoard,ListView,TaskCard,SubTaskList}.tsx`

**Interfaces:**

- Consumes: `userTasks` query, `updateTask` mutation from Task 8.
- Produces: `Board` renders a Tabs toggle (Board | List) sharing one task dataset.

- [ ] **Step 1: `Board.tsx`** — fetch `userTasks`; shadcn `Tabs` switching `<KanbanBoard>` / `<ListView>`; holds search state (Task 12) and the create-task button.

- [ ] **Step 2: `KanbanBoard.tsx`** — three columns by `taskStatus`. @dnd-kit `DndContext`; `TaskCard` draggable. On drop into another column, call `updateTask({ id, taskStatus })` with an optimistic response so the card moves instantly; refetch on error.

- [ ] **Step 3: `TaskCard.tsx`** — shadcn Card showing title + status Badge; expand toggle renders `<SubTaskList>`; actions menu (edit/delete) — dialog wired in Task 11.

- [ ] **Step 4: `SubTaskList.tsx`** — renders `parent.subTasks`; "add sub-task" opens the task dialog pre-set with `parentTaskId`.

- [ ] **Step 5: `ListView.tsx`** — tasks grouped by status with filter chips (Badge buttons) and inline status change (dropdown → `updateTask`).

- [ ] **Step 6: Checkpoint (browser)** — board shows tasks in correct columns; dragging a card across columns persists the status (survives refresh); list view mirrors the same data; sub-tasks expand.

---

### Task 11: Task CRUD dialog

**Files:**

- Create: `client/src/components/board/TaskDialog.tsx`
- Modify: `TaskCard.tsx`, `Board.tsx` (wire open/close)

- [ ] **Step 1: `TaskDialog.tsx`** — shadcn Dialog with title input + status select + optional `parentTaskId`. Create mode → `createTask`; edit mode → `updateTask`. Delete handled via a confirm dialog → `deleteTask`. Update Apollo cache (refetch `userTasks` or `cache.modify`) so lists refresh.

- [ ] **Step 2: Checkpoint (browser)** — create a task (appears in TODO), edit its title, add a sub-task, delete a task (confirm → gone). All persist across refresh.

---

### Task 12: Search + cursor pagination

**Files:**

- Modify: `Board.tsx` (search box + load-more)

- [ ] **Step 1: Debounced search** — text input (300ms debounce) feeds `filter.searchText`; re-query `userTasks`.

- [ ] **Step 2: Load-more** — button/infinite-scroll using `pageInfo.nextPageCursor` via Apollo `fetchMore`, merging `taskFeed`. Configure an `InMemoryCache` type policy for the `TaskFeed.taskFeed` merge.

- [ ] **Step 3: Checkpoint (browser)** — searching narrows the board; with >limit tasks, "load more" appends the next page; empty search resets.

---

### Task 13: Admin read-only view

**Files:**

- Create: `client/src/pages/Admin.tsx`

- [ ] **Step 1: `Admin.tsx`** — admin-gated route; runs `users(filter,cursor)` query; shadcn Table of name/email + task count (`user.tasks.length`); reuse the debounced search + load-more from Task 12. No mutations.

- [ ] **Step 2: Checkpoint (browser)** — log in as the seeded ADMIN → `/admin` lists all users with task counts + search + pagination; a USER hitting `/admin` is redirected.

---

### Task 14: UX polish

**Files:** cross-cutting (theme provider, loaders, empty states).

- [ ] **Step 1: Theme** — light/dark toggle (shadcn theme; persist choice in `localStorage`, respect `prefers-color-scheme`).
- [ ] **Step 2: Feedback** — `<Toaster />` (sonner) mounted once; success/error toasts on every mutation.
- [ ] **Step 3: Loading/empty** — Skeleton components while queries load; friendly empty states for no-tasks / no-results / no-users.
- [ ] **Step 4: Responsive** — board columns stack on mobile; nav collapses.
- [ ] **Step 5: Checkpoint (browser)** — toggle theme; observe skeletons on slow load; empty states render; layout holds at 375px and 1440px widths.

---

## PHASE C — Deploy + finalize

### Task 15: `render.yaml`, README, final review + single commit

**Files:**

- Create: `render.yaml`
- Rewrite: `README.md`

- [ ] **Step 1: Create `render.yaml`**

```yaml
databases:
  - name: task-manager-db
    plan: free

services:
  - type: web
    name: task-manager-api
    runtime: node
    plan: free
    rootDir: server
    buildCommand: npm install
    preDeployCommand: npm run migrate && npm run seed
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: task-manager-db
          property: connectionString
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: CLIENT_ORIGIN
        sync: false
      - key: ADMIN_EMAIL
        sync: false
      - key: ADMIN_PASSWORD
        sync: false

  - type: web
    name: task-manager-web
    runtime: static
    rootDir: client
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    envVars:
      - key: VITE_GRAPHQL_URL
        sync: false
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

> `CLIENT_ORIGIN` (api) and `VITE_GRAPHQL_URL` (web) are cross-references filled in the Render dashboard after first deploy assigns URLs. `preDeployCommand` runs migrations + idempotent admin seed on every deploy.

- [ ] **Step 2: Rewrite `README.md`** — project overview, local dev (server + client), env vars table, and Render deploy steps (create blueprint from `render.yaml`, set the three `sync:false` vars, wire the two cross-referenced URLs).

- [ ] **Step 3: Coding-norms self-review** — run the `simplify` and `code-review:code-review` skills over the full server diff (client is TS, norms target the JS server). Confirm: `const` usage, `{}` block statements, model `query` pattern, lodash transforms, single-param signatures, "why" comments. Fix findings inline. Report checked/found/fixed in the handoff.

- [ ] **Step 4: Full local verification** — server boots, migrations + seed run, all GraphQL smoke tests (Task 6) pass, client builds (`npm run build`) with no type errors, full browser walkthrough of every flow.

- [ ] **Step 5: Present diff to user.** Wait for review approval. Then a SINGLE commit bundling everything:

```bash
git add -A
git commit -m "Full-stack revamp: modernize GraphQL API (Apollo v5/Express 5), fix security + deploy bugs, add React frontend, Render deploy config"
```

(Co-Authored-By trailer added per commit convention.)

- [ ] **Step 6: Push** — only after the user's explicit go-ahead: `git push -u origin revamp-fullstack`.

---

## Self-Review (plan vs spec)

**Spec coverage:**

- §4 repo layout → Task 1, 7. §5 BE modernize → Task 2, 3. §6 security (injection, role, N+1, JWT, CORS, root route) → Task 2 (CORS/root route in server.js), Task 4 (injection/role/JWT/N+1). §7 DB/migrations/prod knexfile → Task 5. §8 FE (auth/board+list/subtasks/search/pagination/admin/polish) → Tasks 7–14. §9 deploy → Task 15. §10 verification → Tasks 6, 15. All covered.

**Placeholder scan:** No TBD/TODO. Config-dependent cross-URLs (`CLIENT_ORIGIN`, `VITE_GRAPHQL_URL`) are explicitly deferred to the Render dashboard by design, not plan gaps.

**Type/name consistency:** `batchSubTasksId` contract (grouped arrays) defined in Task 4 and consumed there; `useAuth()`/`ProtectedRoute` defined in Task 9 and consumed in Tasks 10/13; `userTasks`/`updateTask` documents defined in Task 8 and consumed in Tasks 10–12. Consistent.

**Note on TDD:** Backend has no existing test harness; this plan adds targeted logic tests for the security-critical changes (Task 4) and relies on GraphQL smoke tests + real-browser verification (Tasks 6, 9–14) elsewhere, per spec §10 and user coding norms (which prioritize self-review over exhaustive unit tests here).
