import _ from "lodash";

import { db } from "../util/index.js";
import { decodeFromBase64 } from "../../service/auth.js";

const getTasks = async (data) => {
  try {
    const { searchText, limit, hasDeleted, sortBy, cursor } = data;
    const query = db.select("*").from("public.task");

    if (!hasDeleted) {
      query.where("is_deleted", false);
    }

    if (searchText) {
      query.andWhereILike("title", `%${searchText}%`);
    }

    if (cursor) {
      const operator = sortBy === "ASC" ? ">=" : "<=";
      query.andWhere("id", operator, await decodeFromBase64(cursor));
    }

    if (limit) {
      query.limit(limit + 1);
    }

    if (sortBy) {
      query.orderBy("id", _.toLower(sortBy));
    }

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getUserTasks = async (data) => {
  try {
    const { id, searchText, limit, sortBy, cursor } = data;

    const query = db.select("*").from("public.task").where({
      fk_user_id: id,
      is_deleted: false,
    });

    if (searchText) {
      query.andWhereILike("title", `%${searchText}%`);
    }

    if (cursor) {
      const operator = sortBy === "ASC" ? ">=" : "<=";
      query.where("id", operator, await decodeFromBase64(cursor));
    }

    if (limit) {
      query.limit(limit + 1);
    }

    if (sortBy) {
      query.orderBy("id", _.toLower(sortBy));
    }

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getTaskById = async (data) => {
  try {
    const { id } = data;
    const query = db
      .select("*")
      .from("public.task")
      .where("id", id)
      .where("is_deleted", false)
      .first();

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const addTask = async (data) => {
  try {
    const { title, task_status, fk_user_id } = data;
    const query = db("public.task")
      .returning(["id", "title", "task_status", "fk_user_id"])
      .insert({ title, task_status, fk_user_id });

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const createTaskMapping = async (data) => {
  try {
    const { fk_parent_task_id, fk_sub_task_id } = data;
    const query = db("public.map_parent_sub_task")
      .returning(["id", "fk_parent_task_id", "fk_sub_task_id"])
      .insert({ fk_parent_task_id, fk_sub_task_id });

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const editTask = async (data) => {
  try {
    const { id, title, task_status } = data;

    const updateTaskInput = {};
    if (title) {
      updateTaskInput["title"] = title;
    }
    if (task_status) {
      updateTaskInput["task_status"] = task_status;
    }

    // A call with no updatable fields (e.g. only `id`) yields {} — Knex .update({}) errors, so short-circuit to
    // the current row. Wrapped in an array to match the shape `.update(...)` returns (callers read `[0]`).
    if (_.isEmpty(updateTaskInput)) {
      const currentTask = await getTaskById({ id });
      return [currentTask];
    }

    // Bump updated_at only when a real field changed (skipped by the guard above).
    updateTaskInput["updated_at"] = new Date(Date.now()).toISOString();

    const query = db("public.task")
      .where({ id: id })
      .update(updateTaskInput, ["id", "title", "task_status", "fk_user_id"]);

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const editTaskMapping = async (data) => {
  try {
    const { id, fk_parent_task_id } = data;

    const query = db("public.map_parent_sub_task")
      .where({ fk_sub_task_id: id })
      .update({ fk_parent_task_id: fk_parent_task_id }, [
        "id",
        "fk_parent_task_id",
        "fk_sub_task_id",
      ]);

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const removeTask = async (data) => {
  try {
    const { id } = data;
    const deleted_at = new Date(Date.now()).toISOString();

    const query = db("public.task")
      .where({ id: id })
      .update({ is_deleted: true, deleted_at }, [
        "id",
        "title",
        "task_status",
        "fk_user_id",
      ]);

    const deletedTask = await query;

    return deletedTask[0];
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const removeTaskMappings = async (data) => {
  try {
    const { taskId } = data;
    const deleted_at = new Date(Date.now()).toISOString();

    const query = db("public.map_parent_sub_task")
      .where("fk_sub_task_id", taskId)
      .orWhere("fk_parent_task_id", taskId)
      .update({ is_deleted: true, deleted_at }, ["id"]);

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getSubTaskIds = async (data) => {
  try {
    const { parentTaskId } = data;
    const query = db
      .select("fk_sub_task_id")
      .from("public.map_parent_sub_task")
      .where("fk_parent_task_id", parentTaskId)
      .where("is_deleted", false);

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getBatchTasks = async (data) => {
  try {
    const { keys } = data;
    const query = db("public.task")
      .select("*")
      .whereIn("id", keys)
      .where("is_deleted", false);

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getBatchSubTasksId = async (data) => {
  try {
    const { keys } = data;
    const query = db("public.map_parent_sub_task")
      .select("*")
      .whereIn("fk_parent_task_id", keys)
      .where("is_deleted", false);

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getBatchUserTasksId = async (data) => {
  try {
    const { keys } = data;
    const query = db("public.task")
      .select("*")
      .whereIn("fk_user_id", keys)
      .where("is_deleted", false);

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export {
  getTasks,
  getUserTasks,
  getTaskById,
  addTask,
  createTaskMapping,
  editTask,
  editTaskMapping,
  removeTask,
  removeTaskMappings,
  getSubTaskIds,
  getBatchTasks,
  getBatchSubTasksId,
  getBatchUserTasksId,
};
