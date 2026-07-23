const _ = require('lodash');

const { getBatchTasks, getBatchSubTasksId, getBatchUserTasksId } = require('../../database/models/task');

module.exports.batchTasks = async (keys) => {
    try {
        keys = keys.map(Number);
        const tasks = await getBatchTasks({ keys });

        return keys.map(key => tasks.find(task => task.id === key));
    } catch (error) {
        console.log(error);
        throw error;
    }
};

module.exports.batchSubTasksId = async (keys) => {
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

module.exports.batchUserTasksId = async (keys) => {
    try {
        keys = keys.map(Number);
        const userTasksId = await getBatchUserTasksId({ keys });
        const group = _.groupBy(userTasksId, user => user.fk_user_id);

        return keys.map((key) => group[key] || []);
    } catch (error) {
        console.log(error);
        throw error;
    }
};
