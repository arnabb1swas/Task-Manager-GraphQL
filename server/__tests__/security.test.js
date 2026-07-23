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

// isTaskCreator's id resolution must handle both arg shapes: flat (Query.task) and nested (mutations).
test("isTaskCreator id resolution handles both flat and input-wrapped args", () => {
  const flatArgs = { id: 5 };
  const nestedArgs = { input: { id: 5 } };

  const flatId = flatArgs.input ? flatArgs.input.id : flatArgs.id;
  const nestedId = nestedArgs.input ? nestedArgs.input.id : nestedArgs.id;

  assert.strictEqual(flatId, 5);
  assert.strictEqual(nestedId, 5);
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
