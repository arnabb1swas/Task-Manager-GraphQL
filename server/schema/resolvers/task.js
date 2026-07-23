const _ = require('lodash');

const { getPageInfo } = require('../../service/auth');
const {
    getTaskById,
    addTask,
    getTasks,
    editTask,
    removeTask,
    getUserTasks,
    editTaskMapping,
    createTaskMapping,
} = require('../../database/models');

module.exports = {

    Query: {
        tasks: async (parent, args, context) => {
            try {
                const { filter: { searchText, limit, hasDeleted = false, sortBy = 'ASC' }, cursor } = args;

                const tasks = await getTasks({ searchText, limit, hasDeleted, sortBy, cursor });

                if (!tasks) {
                    throw new Error("TASK NOT FOUND");
                }

                const { objArr, pageInfo } = await getPageInfo({ obj: tasks, limit });
                return { taskFeed: objArr, pageInfo };
            } catch (error) {
                console.log(error);
                throw error;
            }
        },
        userTasks: async (parent, args, context) => {
            try {
                const { jwtUser: { id } } = context;
                const { filter: { searchText, limit, sortBy = 'ASC' }, cursor } = args;

                let userTasks = await getUserTasks({ id, searchText, limit, sortBy, cursor });
                if (!userTasks) {
                    throw new Error("TASK NOT FOUND");
                }

                const { objArr, pageInfo } = await getPageInfo({ obj: userTasks, limit });

                return { taskFeed: objArr, pageInfo };
            } catch (error) {
                console.log(error);
                throw error;
            }
        },
        task: async (parent, args, context) => {
            try {
                const { id } = args;
                const task = await getTaskById({ id });
                if (!task) {
                    throw new Error("TASK NOT FOUND");
                }

                return task;
            } catch (error) {
                console.log(error);
                throw error;
            }
        },
    },

    Mutation: {
        createTask: async (parent, args, context) => {
            try {
                const { jwtUser: { id } } = context;
                const { input: { title, taskStatus, parentTaskId } } = args;

                const newTask = await addTask({ title, task_status: taskStatus, fk_user_id: id });

                if (parentTaskId) {
                    await createTaskMapping({ fk_parent_task_id: parentTaskId, fk_sub_task_id: newTask[0].id });
                }

                return newTask[0];
            } catch (error) {
                console.log(error);
                throw error;
            }
        },
        updateTask: async (parent, args, context) => {
            try {
                const { input: { id, title, taskStatus, parentTaskId } } = args;

                const updatedTask = await editTask({ id, title, task_status: taskStatus });

                if (parentTaskId) {
                    await editTaskMapping({ id, fk_parent_task_id: parentTaskId });
                }

                return updatedTask[0];
            } catch (error) {
                console.log(error);
                throw error;
            }
        },
        deleteTask: async (parent, args, context) => {
            try {
                const { input: { id } } = args;
                const deletedTask = await removeTask({ id });

                return deletedTask;
            } catch (error) {
                console.log(error);
                throw error;
            }
        },
    },

    Task: {
        id: (parent, args, context) => parent.id,
        title: (parent, args, context) => parent.title,
        taskStatus: (parent, args, context) => parent.task_status,
        user: async (parent, args, context) => {
            try {
                const { fk_user_id: id } = parent;
                const { loaders: { batchUser } } = context;
                const user = await batchUser.load(id);
                return user;
            } catch (error) {
                console.log(error);
                throw error;
            }
        },
        subTasks: async (parent, args, context) => {
            try {
                const { id: parentTaskId } = parent;
                const { loaders: { batchTask, batchSubTasksId } } = context;
                let tasks = [];

                const subTaskRows = await batchSubTasksId.load(parentTaskId);
                if (!_.isEmpty(subTaskRows)) {
                    const taskIds = _.map(subTaskRows, row => row.fk_sub_task_id);
                    tasks = await batchTask.loadMany(taskIds);
                }

                return tasks;
            } catch (error) {
                console.log(error);
                throw error;
            }
        },
    }
};
