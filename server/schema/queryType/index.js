import gql from "graphql-tag";

import userTypeDefs from "./user.js";
import taskTypeDefs from "./task.js";

const typeDefs = gql`
    type Query {
        _: String
    }

    type Mutation {
        _: String
    }

    enum SORT_BY_ENUM {
        ASC
        DESC
    }

    input Filter {
        searchText: String
        limit: Int
        hasDeleted: Boolean!
        sortBy: SORT_BY_ENUM!
    }

    type PageInfo {
        nextPageCursor: String
        hasNextPage: Boolean
    }
`;

export default [typeDefs, userTypeDefs, taskTypeDefs];
