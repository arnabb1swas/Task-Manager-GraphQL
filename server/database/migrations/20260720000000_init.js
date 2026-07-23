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
