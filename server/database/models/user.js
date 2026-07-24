import _ from "lodash";

import { db } from "../util/index.js";
import { hashPassword, decodeFromBase64 } from "../../service/auth.js";

const getUsers = async (data) => {
  try {
    const { searchText, limit, hasDeleted, sortBy, cursor } = data;
    const query = db
      .select("id", "name", "email", "is_deleted")
      .from("public.user");

    if (!hasDeleted) {
      query.where("is_deleted", false);
    }

    if (searchText) {
      query.andWhere((builder) => {
        builder
          .whereILike("name", `%${searchText}%`)
          .orWhereILike("email", `%${searchText}%`);
      });
    }

    if (cursor) {
      const operator = sortBy === "ASC" ? ">=" : "<=";
      const decodedCursor = await decodeFromBase64(cursor);
      query.andWhere("id", operator, decodedCursor);
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

const getUserById = async (data) => {
  try {
    const { id } = data;
    const query = db
      .select("id", "name", "email")
      .from("public.user")
      .where({ id, is_deleted: false })
      .first();

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getUserByEmail = async (data) => {
  try {
    const { email } = data;
    const query = db
      .select("id", "name", "email")
      .from("public.user")
      .where({ email, is_deleted: false })
      .first();

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getLoginUserDetails = async (data) => {
  try {
    const { email } = data;
    const query = db
      .select("*")
      .from("public.user")
      .where({ email, is_deleted: false })
      .first();

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const addUser = async (data) => {
  try {
    const { name, email, password, role } = data;
    const query = db("public.user")
      .returning(["id", "name", "email", "role"])
      .insert({ name, email, password, role });

    const newUser = await query;

    return newUser[0];
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const editUser = async (data) => {
  try {
    const { id, name, email, password } = data;

    const updateUserInput = {};
    if (name) {
      updateUserInput["name"] = name;
    }
    if (email) {
      updateUserInput["email"] = email;
    }
    if (password) {
      updateUserInput["password"] = await hashPassword(password);
    }

    // A call with no updatable fields (e.g. only `id`) yields {} — Knex .update({}) errors, so short-circuit to the current row.
    if (_.isEmpty(updateUserInput)) {
      return await getUserById({ id });
    }

    // Bump updated_at only when a real field changed (skipped by the guard above).
    updateUserInput["updated_at"] = new Date(Date.now()).toISOString();

    const query = db("public.user")
      .where({ id: id })
      .update(updateUserInput, ["id", "name", "email"]);

    const updatedUser = await query;

    return updatedUser[0];
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const removeUser = async (data) => {
  try {
    const { id } = data;
    const deleted_at = new Date(Date.now()).toISOString();

    // Only the user row is soft-deleted here. Their tasks/mappings are left
    // untouched on purpose: a later "undo delete user" must restore cleanly,
    // and we can't tell user-intended task deletes from a cascade after the fact.
    const query = db("public.user")
      .where({ id: id })
      .update({ is_deleted: true, deleted_at }, [
        "id",
        "name",
        "email",
        "deleted_at",
      ]);

    const deletedUser = await query;

    return deletedUser[0];
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const restoreUser = async (data) => {
  try {
    const { id } = data;

    // Undo a soft-delete: clear the flag and the timestamp. Tasks/mappings were
    // never touched on delete (see removeUser), so nothing else needs reverting.
    const query = db("public.user")
      .where({ id: id })
      .update({ is_deleted: false, deleted_at: null }, [
        "id",
        "name",
        "email",
        "is_deleted",
      ]);

    const restoredUser = await query;

    return restoredUser[0];
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getBatchUsers = async (data) => {
  try {
    const { keys } = data;
    const query = db("public.user")
      .select("*")
      .whereIn("id", keys)
      .where("is_deleted", false);

    return await query;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export {
  getUsers,
  getUserById,
  getUserByEmail,
  getLoginUserDetails,
  addUser,
  editUser,
  removeUser,
  restoreUser,
  getBatchUsers,
};
