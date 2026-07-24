// One-off seed for manual admin-page testing (pagination + restore/undo).
// Creates >20 active users so "Load more" triggers, plus a few soft-deleted
// users so "Show deleted" + "Undo delete" can be exercised.
//
// Run from the server dir:  node scripts/seed-admin-test-data.cjs
// Cleanup:                   node scripts/seed-admin-test-data.cjs --clean
// All rows use the seedtest+ email prefix so cleanup is exact.

require("dotenv").config();

const bcrypt = require("bcryptjs");

const knex = require("knex")({
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
});

const EMAIL_PREFIX = "seedtest+";
const ACTIVE_COUNT = 25;
const DELETED_COUNT = 3;

const clean = async () => {
  const removed = await knex("public.user")
    .whereILike("email", `${EMAIL_PREFIX}%`)
    .del();

  console.log(`Removed ${removed} seed user(s).`);
};

const seed = async () => {
  const password = await bcrypt.hash("SeedUser123!", 10);
  const deletedAt = new Date(Date.now()).toISOString();

  const rows = [];

  // Active users — pad the number so ids/names sort predictably.
  for (let i = 1; i <= ACTIVE_COUNT; i += 1) {
    const n = String(i).padStart(2, "0");

    rows.push({
      name: `Seed User ${n}`,
      email: `${EMAIL_PREFIX}active-${n}@example.com`,
      password,
      role: "USER",
      is_deleted: false,
    });
  }

  // Soft-deleted users — for the Show-deleted / Undo-delete flow.
  for (let i = 1; i <= DELETED_COUNT; i += 1) {
    const n = String(i).padStart(2, "0");

    rows.push({
      name: `Deleted User ${n}`,
      email: `${EMAIL_PREFIX}deleted-${n}@example.com`,
      password,
      role: "USER",
      is_deleted: true,
      deleted_at: deletedAt,
    });
  }

  // Idempotent: re-running skips emails already present.
  const inserted = await knex("public.user")
    .insert(rows)
    .onConflict("email")
    .ignore()
    .returning("id");

  console.log(
    `Seeded ${inserted.length} new user(s) ` +
      `(${ACTIVE_COUNT} active + ${DELETED_COUNT} deleted requested).`,
  );
};

(async () => {
  try {
    if (process.argv.includes("--clean")) {
      await clean();
    } else {
      await seed();
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();
