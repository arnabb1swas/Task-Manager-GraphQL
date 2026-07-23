const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports.createAuthToken = async (data) => {
    try {
        return jwt.sign(data, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.verifyUserAuth = async (req) => {
    try {
        if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
            const token = req.headers.authorization.split(" ")[1];
            const userDetails = jwt.verify(token, process.env.JWT_SECRET_KEY);
            return userDetails;
        }
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.comparePassword = async (userPass, password) => {
    try {
        return await bcrypt.compare(password, userPass);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports.decodeFromBase64 = async (data) => {
    try {
        return Buffer.from(data.toString(), "base64").toString("ascii");
    } catch (error) {
        console.log(error);
        throw error;
    }
};

const encodeToBase64 = async (data) => {
    try {
        return Buffer.from(data.toString()).toString("base64");
    } catch (error) {
        console.log(error);
        throw error;
    }
};

module.exports.getPageInfo = async (data) => {
    let { obj, limit } = data;

    const hasNextPage = obj.length > limit;
    const nextPageCursor = hasNextPage ? await encodeToBase64(obj[obj.length - 1].id) : null;
    obj = hasNextPage ? obj.slice(0, -1) : obj;

    return { objArr: obj, pageInfo: { hasNextPage, nextPageCursor } };
};
