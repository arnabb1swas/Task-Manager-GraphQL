import _ from "lodash";

import {
  getBatchTasks,
  getBatchSubTasksId,
  getBatchUserTasksId,
} from "../../database/models/task.js";

export const batchTasks = async (keys) => {
  try {
    keys = _.map(keys, Number);
    const tasks = await getBatchTasks({ keys });
    const tasksById = _.keyBy(tasks, "id");

    return _.map(keys, (key) => tasksById[key]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const batchSubTasksId = async (keys) => {
  try {
    keys = keys.map(Number);
    const subTaskRows = await getBatchSubTasksId({ keys });

    // Group so every sub-task of a parent is returned, not just the first.
    const grouped = _.groupBy(subTaskRows, (row) => row.fk_parent_task_id);

    return keys.map((key) => grouped[key] || []);
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const batchUserTasksId = async (keys) => {
  try {
    keys = keys.map(Number);
    const userTasksId = await getBatchUserTasksId({ keys });
    const group = _.groupBy(userTasksId, (user) => user.fk_user_id);

    return keys.map((key) => group[key] || []);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
