const _ = require('lodash');
const { db } = require('../../database/util');
const { decodeFromBase64 } = require('../../service/auth');

module.exports.getTasks = async (data) => {
    try {
        const { searchText, limit, hasDeleted, sortBy, cursor } = data;
        const query = db.select('*').from("public.task");

        if (!hasDeleted) {
            query.whereNull('deleted_at')
        }
        if (searchText) {
            query.andWhereILike('title', `%${searchText}%`)
        }
        if (cursor) {
            const operator = sortBy === 'ASC' ? '>=' : '<=';
            query.andWhere('id', operator, await decodeFromBase64(cursor))
        }
        if (limit) {
            query.limit(limit + 1)
        }
        if (sortBy) {
            query.orderBy('id', _.toLower(sortBy))
        }

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.getUserTasks = async (data) => {
    try {
        const { id, searchText, limit, sortBy, cursor } = data;
        // A user's own soft-deleted tasks are always hidden here, regardless of the shared
        // Filter.hasDeleted field — that flag is honored only by the admin `users`/`tasks` paths.
        const query = db.select('*').from("public.task").where("fk_user_id", id).whereNull('deleted_at');

        if (searchText) {
            query.andWhereILike('title', `%${searchText}%`)
        }
        if (cursor) {
            const operator = sortBy === 'ASC' ? '>=' : '<=';
            query.andWhere('id', operator, await decodeFromBase64(cursor))
        }
        if (limit) {
            query.limit(limit + 1)
        }
        if (sortBy) {
            query.orderBy('id', _.toLower(sortBy))
        }

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.getTaskById = async (data) => {
    try {
        const { id } = data;
        const query = db.select('*').from("public.task").where("id", id).whereNull('deleted_at').first();

        return await query;

    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.addTask = async (data) => {
    try {
        const { title, task_status, fk_user_id } = data;
        const query = db("public.task").returning(['id', 'title', 'task_status', 'fk_user_id']).insert({ title, task_status, fk_user_id });

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.createTaskMapping = async (data) => {
    try {
        const { fk_parent_task_id, fk_sub_task_id } = data;
        const query = db("public.map_parent_sub_task").returning(['id', 'fk_parent_task_id', 'fk_sub_task_id']).insert({ fk_parent_task_id, fk_sub_task_id });

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.editTask = async (data) => {
    try {
        const { id, title, task_status } = data;

        const updateTaskInput = {};
        if (title) {
            updateTaskInput['title'] = title;
        }
        if (task_status) {
            updateTaskInput['task_status'] = task_status;
        }

        // A call with no updatable fields (e.g. only `id`) yields {} — Knex .update({}) errors, so short-circuit to
        // the current row. Wrapped in an array to match the shape `.update(...)` returns (callers read `[0]`).
        if (_.isEmpty(updateTaskInput)) {
            const currentTask = await module.exports.getTaskById({ id });
            return [currentTask];
        }

        const query = db('public.task').where({ 'id': id }).update(updateTaskInput, ['id', 'title', 'task_status', 'fk_user_id']);

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.editTaskMapping = async (data) => {
    try {
        const { id, fk_parent_task_id } = data;

        const query = db('public.map_parent_sub_task')
            .where({ 'fk_sub_task_id': id })
            .update({ fk_parent_task_id: fk_parent_task_id }, ['id', 'fk_parent_task_id', 'fk_sub_task_id']);

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.removeTask = async (data) => {
    try {
        const { id } = data;
        const deleted_at = new Date(Date.now()).toISOString();

        const deletedTask = await db('public.task').where({ 'id': id }).update({ deleted_at }, ['id', 'title', 'task_status', 'fk_user_id']);
        if (deletedTask[0]) {
            await db('public.map_parent_sub_task').where('fk_sub_task_id', deletedTask[0].id).orWhere('fk_parent_task_id', deletedTask[0].id).update({ deleted_at }, ['id']);
        }

        return deletedTask[0];
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.getSubTaskIds = async (data) => {
    try {
        const { parentTaskId } = data;
        const query = db.select('fk_sub_task_id').from("public.map_parent_sub_task").where("fk_parent_task_id", parentTaskId).whereNull('deleted_at');

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.getBatchTasks = async (data) => {
    try {
        const { keys } = data;
        const query = db("public.task").select("*").whereIn("id", keys).whereNull('deleted_at');

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.getBatchSubTasksId = async (data) => {
    try {
        const { keys } = data;
        const query = db("public.map_parent_sub_task").select("*").whereIn("fk_parent_task_id", keys).whereNull('deleted_at');

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.getBatchUserTasksId = async (data) => {
    try {
        const { keys } = data;
        const query = db("public.task").select("*").whereIn("fk_user_id", keys).whereNull('deleted_at');

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
