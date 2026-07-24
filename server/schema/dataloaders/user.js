import _ from "lodash";

import { getBatchUsers } from "../../database/models/user.js";

export const batchUsers = async (keys) => {
  try {
    keys = _.map(keys, Number);
    const users = await getBatchUsers({ keys });
    const usersById = _.keyBy(users, "id");

    return _.map(keys, (key) => usersById[key]);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
