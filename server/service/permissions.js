import { createRequire } from "module";

import {
  isAuthenticated,
  isAdmin,
  isTaskCreator,
  isValidEmail,
} from "./rules.js";

// See rules.js: graphql-shield's ESM build is broken, so use the CJS build.
const require = createRequire(import.meta.url);
const { shield, and } = require("graphql-shield");

export const permissions = shield({
  Query: {
    users: and(isAuthenticated, isAdmin),
    user: isAuthenticated,
    tasks: and(isAuthenticated, isAdmin),
    userTasks: isAuthenticated,
    task: and(isAuthenticated, isTaskCreator),
  },

  Mutation: {
    signUp: isValidEmail,
    logIn: isValidEmail,
    updateUser: isAuthenticated,
    deleteUser: isAuthenticated,
    restoreUser: and(isAuthenticated, isAdmin),
    createTask: isAuthenticated,
    updateTask: and(isAuthenticated, isTaskCreator),
    deleteTask: and(isAuthenticated, isTaskCreator),
  },
});
