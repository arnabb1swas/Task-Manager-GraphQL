const { getBatchUsers } = require('../../database/models/user');

module.exports.batchUsers = async (keys) => {
    try {
        keys = keys.map(Number);
        const users = await getBatchUsers({ keys });

        return keys.map(key => users.find(user => user.id === key));
    } catch (error) {
        console.log(error);
        throw error;
    }
};
