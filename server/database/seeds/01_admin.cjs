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
