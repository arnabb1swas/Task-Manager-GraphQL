import _ from "lodash";
import validator from "validator";

import {
  createAuthToken,
  comparePassword,
  hashPassword,
  getPageInfo,
} from "../../service/auth.js";
import {
  addUser,
  editUser,
  getUsers,
  removeUser,
  restoreUser,
  getUserById,
  getUserByEmail,
  getLoginUserDetails,
} from "../../database/models/user.js";

export default {
  Query: {
    users: async (parent, args, context) => {
      try {
        const {
          filter: { searchText, limit, hasDeleted = false, sortBy = "ASC" },
          cursor,
        } = args;

        const users = await getUsers({
          searchText,
          limit,
          hasDeleted,
          sortBy,
          cursor,
        });
        if (!users) {
          throw new Error("USER NOT FOUND");
        }

        const { objArr, pageInfo } = await getPageInfo({ obj: users, limit });

        return { userFeed: objArr, pageInfo };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    user: async (parent, args, context) => {
      try {
        const {
          jwtUser: { id },
        } = context;

        const user = await getUserById({ id });
        if (!user) {
          throw new Error("USER NOT FOUND");
        }

        return user;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },

  Mutation: {
    signUp: async (parent, args, context) => {
      try {
        const {
          input: { name, email, password },
        } = args;

        const user = await getUserByEmail({ email });
        if (user) {
          throw new Error("EMAIL ALREADY EXIST");
        }

        const hashedPassword = await hashPassword(password);

        // Role is never client-supplied — prevents self-registering as ADMIN.
        const newUser = await addUser({
          name,
          email,
          password: hashedPassword,
          role: "USER",
        });
        const token = await createAuthToken({
          id: newUser.id,
          role: newUser.role,
        });

        return { token, user: newUser };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    logIn: async (parent, args, context) => {
      try {
        const {
          input: { email, password },
        } = args;

        const user = await getLoginUserDetails({ email });

        if (!user) {
          throw new Error("USER NOT FOUND");
        }

        const validPassword = await comparePassword(user.password, password);

        if (!validPassword) {
          throw new Error("INCORRECT PASSWORD");
        }

        const token = await createAuthToken({ id: user.id, role: user.role });

        return { token, user };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    updateUser: async (parent, args, context) => {
      try {
        const {
          input: { name, email, password },
        } = args;
        const {
          jwtUser: { id },
        } = context;
        if (email) {
          const isValidEmail = validator.isEmail(email);
          if (!isValidEmail) {
            return new Error("INVALID EMAIL");
          }
        }

        const updatedUser = await editUser({ id, name, email, password });

        return updatedUser;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    deleteUser: async (parent, args, context) => {
      try {
        const {
          jwtUser: { id },
        } = context;

        // Deleting a user soft-deletes only the user row (see removeUser);
        // tasks/mappings are intentionally left intact for reversibility.
        const deletedUser = await removeUser({ id });

        return !!deletedUser;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    restoreUser: async (parent, args, context) => {
      try {
        const {
          input: { id },
        } = args;

        // Admin-only (enforced in permissions.js). Reverses a soft-delete.
        const restoredUser = await restoreUser({ id });
        if (!restoredUser) {
          throw new Error("USER NOT FOUND");
        }

        return restoredUser;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },

  User: {
    id: (parent, args, context) => parent.id,
    name: (parent, args, context) => parent.name,
    email: (parent, args, context) => parent.email,
    isDeleted: (parent, args, context) => parent.is_deleted,
    tasks: async (parent, args, context) => {
      try {
        const { id } = parent;
        const {
          loaders: { batchTask, batchUserTasksId },
        } = context;
        let tasks = [];

        const userTaskIds = await batchUserTasksId.load(id);
        if (!_.isEmpty(userTaskIds)) {
          const taskIds = _.map(userTaskIds, (task) => task.id);
          tasks = await batchTask.loadMany(taskIds);
        }

        return tasks;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
