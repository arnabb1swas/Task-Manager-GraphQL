const {
    addUser,
    editUser,
    getUsers,
    removeUser,
    getUserById,
    getUserByEmail,
    getLoginUserDetails,
} = require('./user');

const {
    addTask,
    getTasks,
    editTask,
    removeTask,
    getTaskById,
    getUserTasks,
    getSubTaskIds,
    editTaskMapping,
    createTaskMapping,
} = require('./task');

module.exports = {
    getUsers,
    getUserById,
    getUserByEmail,
    getLoginUserDetails,
    addUser,
    editUser,
    removeUser,
    getTaskById,
    addTask,
    getTasks,
    editTask,
    removeTask,
    getUserTasks,
    getSubTaskIds,
    editTaskMapping,
    createTaskMapping,
}
