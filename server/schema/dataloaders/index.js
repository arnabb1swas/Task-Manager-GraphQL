import DataLoader from "dataloader";

import * as user from "./user.js";
import * as task from "./task.js";

// Loaders MUST be created per request. A shared module-level instance caches
// results for the whole server lifetime, so relations (e.g. a task's sub-tasks)
// go stale after mutations until restart, and data leaks across requests/users.
const createLoaders = () => ({
  batchUser: new DataLoader((keys) => user.batchUsers(keys)),
  batchTask: new DataLoader((keys) => task.batchTasks(keys)),
  batchSubTasksId: new DataLoader((keys) => task.batchSubTasksId(keys)),
  batchUserTasksId: new DataLoader((keys) => task.batchUserTasksId(keys)),
});

export default createLoaders;
