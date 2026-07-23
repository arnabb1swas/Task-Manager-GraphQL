const { shield, and } = require('graphql-shield');

const { isAuthenticated, isAdmin, isTaskCreator, isValidEmail } = require('./rules');

module.exports.permissions = shield({
    Query: {
        /*  User Permissions */
        users: and(isAuthenticated, isAdmin),
        user: isAuthenticated,

        /*  Task Permissions */
        tasks: and(isAuthenticated, isAdmin),
        userTasks: isAuthenticated,
        task: and(isAuthenticated, isTaskCreator),
    },

    Mutation: {
        /*  User Permissions */
        signUp: isValidEmail,
        logIn: isValidEmail,
        updateUser: isAuthenticated,
        deleteUser: isAuthenticated,

        /*  Task Permissions */
        createTask: isAuthenticated,
        updateTask: and(isAuthenticated, isTaskCreator),
        deleteTask: and(isAuthenticated, isTaskCreator),
    },
});
