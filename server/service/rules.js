import { createRequire } from "module";
import validator from "validator";

import { getUserById } from "../database/models/user.js";
import { getTaskById } from "../database/models/task.js";

// graphql-shield's ESM build is broken under Node ESM (it does
// `import { isUndefined } from 'util'`, which the built-in module doesn't
// export). Force the working CJS build via createRequire.
const require = createRequire(import.meta.url);
const { rule } = require("graphql-shield");

export const isAuthenticated = rule({ cache: "contextual" })(
  async (parent, args, context, info) => {
    const { jwtUser } = context;

    if (!jwtUser || !jwtUser.id) {
      return new Error("ACCESS DENIED! LOGIN TO CONTINUE");
    }

    const user = await getUserById({ id: jwtUser.id });
    if (!user) {
      return new Error("USER NOT FOUND");
    }

    return true;
  },
);

export const isAdmin = rule({ cache: "contextual" })(
  async (parent, args, context, info) => {
    const { jwtUser } = context;

    // Guard against rule evaluation order — isAdmin can run without isAuthenticated having run first.
    if (!jwtUser) {
      return new Error("ACCESS DENIED! LOGIN TO CONTINUE");
    }

    const { role } = jwtUser;
    if (role !== "ADMIN") {
      return new Error("USER IS NOT AN ADMIN");
    }

    return true;
  },
);

export const isTaskCreator = rule({ cache: "strict" })(
  async (parent, args, context, info) => {
    const { jwtUser } = context;

    // Guard against rule evaluation order — isTaskCreator can run without isAuthenticated having run first.
    if (!jwtUser) {
      return new Error("ACCESS DENIED! LOGIN TO CONTINUE");
    }

    // Query.task uses a flat `id` arg (SDL: task(id: Int!)); task mutations nest it under `input`.
    const id = args.input ? args.input.id : args.id;
    const task = await getTaskById({ id });

    if (!task) {
      return new Error("TASK NOT FOUND");
    } else if (jwtUser.id !== task.fk_user_id) {
      return new Error("UNAUTHORIZED TASK CREATOR");
    }

    return true;
  },
);

export const isValidEmail = rule({ cache: "strict" })(
  async (parent, args, context, info) => {
    const {
      input: { email },
    } = args;
    const isValidEmail = validator.isEmail(email);
    if (!isValidEmail) {
      return new Error("INVALID EMAIL");
    }

    return true;
  },
);
