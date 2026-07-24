import { createRequire } from "module";
import { GraphQLError } from "graphql";
import validator from "validator";

import { getUserById } from "../database/models/user.js";
import { getTaskById } from "../database/models/task.js";

// graphql-shield's ESM build is broken under Node ESM (it does
// `import { isUndefined } from 'util'`, which the built-in module doesn't
// export). Force the working CJS build via createRequire.
const require = createRequire(import.meta.url);
const { rule } = require("graphql-shield");

// Auth failures (missing/invalid identity, or a token for a since-deleted
// user) carry the UNAUTHENTICATED code so the client can reliably detect a
// dead session and redirect to /login — a raw message string is not a stable
// signal. Authorization failures (not-admin, not-owner) deliberately DON'T get
// this: they must not log the user out.
const _unauthenticated = (message) =>
  new GraphQLError(message, { extensions: { code: "UNAUTHENTICATED" } });

export const isAuthenticated = rule({ cache: "contextual" })(
  async (parent, args, context, info) => {
    const { jwtUser } = context;

    if (!jwtUser || !jwtUser.id) {
      return _unauthenticated("ACCESS DENIED! LOGIN TO CONTINUE");
    }

    const user = await getUserById({ id: jwtUser.id });
    if (!user) {
      return _unauthenticated("USER NOT FOUND");
    }

    return true;
  },
);

export const isAdmin = rule({ cache: "contextual" })(
  async (parent, args, context, info) => {
    const { jwtUser } = context;

    // Guard against rule evaluation order — isAdmin can run without isAuthenticated having run first.
    if (!jwtUser) {
      return _unauthenticated("ACCESS DENIED! LOGIN TO CONTINUE");
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
      return _unauthenticated("ACCESS DENIED! LOGIN TO CONTINUE");
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
