const path = require("path");
const dotEnv = require("dotenv");

// The knex CLI chdir's to this file's directory before loading it, so a bare
// dotEnv.config() would look for .env here (database/util) and miss it. Anchor
// to server/.env (two levels up) so migrate/seed pick up env locally. On Render
// the vars come from the environment, so a missing file here is harmless.
dotEnv.config({ path: path.join(__dirname, "../../.env") });

// __dirname-anchored so `knex migrate/seed` finds these no matter the CWD it's
// invoked from (local `cd server`, Render's rootDir, or npx from elsewhere).
const migrations = {
  directory: path.join(__dirname, "../migrations"),
  tableName: "knex_migrations",
};
const seeds = { directory: path.join(__dirname, "../seeds") };

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
    // Render/Neon provide a single connection string; SSL is required.
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 10 },
    migrations,
    seeds,
  },
};
