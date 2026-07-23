const gql = require('graphql-tag');

const userTypeDefs = require('./user');
const taskTypeDefs = require('./task');

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

`

module.exports = [
    typeDefs,
    userTypeDefs,
    taskTypeDefs
];
