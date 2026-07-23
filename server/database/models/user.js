// USER RELATED QUERIES
const _ = require('lodash');

const { db } = require('../../database/util');
const { hashPassword, decodeFromBase64 } = require('../../service/auth');

module.exports.getUsers = async (data) => {
    try {
        const { searchText, limit, hasDeleted, sortBy, cursor } = data;
        const query = db.select('id', 'name', 'email').from("public.user");

        if (!hasDeleted) {
            query.whereNull('deleted_at')
        }
        if (searchText) {
            query.andWhere((builder) => {
                builder
                    .whereILike('name', `%${searchText}%`)
                    .orWhereILike('email', `%${searchText}%`);
            });
        }
        if (cursor) {
            const operator = sortBy === 'ASC' ? '>=' : '<=';
            const decodedCursor = await decodeFromBase64(cursor);
            query.andWhere('id', operator, decodedCursor);
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

module.exports.getUserById = async (data) => {
    try {
        const { id } = data;
        const query = db.select('id', 'name', 'email').from("public.user").where("id", id).whereNull('deleted_at').first();

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.getUserByEmail = async (data) => {
    try {
        const { email } = data;
        const query = db.select('id', 'name', 'email').from("public.user").where("email", email).whereNull('deleted_at').first();

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.getLoginUserDetails = async (data) => {
    try {
        const { email } = data;
        const query = db.select('*').from("public.user").where("email", email).whereNull('deleted_at').first();

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.addUser = async (data) => {
    try {
        const { name, email, password, role } = data;
        const newUser = await db("public.user").returning(['id', 'name', 'email', 'role']).insert({ name, email, password, role });

        return newUser[0];
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.editUser = async (data) => {
    try {
        const { id, name, email, password } = data;

        const updateUserInput = {};
        if (name) {
            updateUserInput['name'] = name;
        }
        if (email) {
            updateUserInput['email'] = email;
        }
        if (password) {
            updateUserInput['password'] = await hashPassword(password);
        }

        // A call with no updatable fields (e.g. only `id`) yields {} — Knex .update({}) errors, so short-circuit to the current row.
        if (_.isEmpty(updateUserInput)) {
            return await module.exports.getUserById({ id });
        }

        const updatedUser = await db('public.user').where({ 'id': id }).update(updateUserInput, ['id', 'name', 'email']);

        return updatedUser[0];
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.removeUser = async (data) => {
    try {
        const { id } = data;
        const deleted_at = new Date(Date.now()).toISOString();

        const deletedUser = await db('public.user').where({ 'id': id }).update({ deleted_at }, ['id', 'name', 'email', 'deleted_at']);
        if (_.isEmpty(deletedUser)) {
            return false;
        }

        const tasksId = await db('public.task').where({ 'fk_user_id': id }).update({ deleted_at }, ['id']);
        const taskIds = _.map(tasksId, task => task.id);
        await db('public.map_parent_sub_task').whereIn('fk_sub_task_id', taskIds).orWhereIn('fk_parent_task_id', taskIds).update({ deleted_at }, ['id']);

        return true;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.getBatchUsers = async (data) => {
    try {
        const { keys } = data;
        const query = db("public.user").select("*").whereIn("id", keys).whereNull('deleted_at');

        return await query;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
