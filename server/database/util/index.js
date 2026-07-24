import knex from "knex";

import knexfile from "./knexfile.cjs";

const env =
  process.env.NODE_ENV === "production" ? "production" : "development";

export const db = knex(knexfile[env]);
