import gql from "graphql-tag";

export default gql`
    extend type Query {
        users(filter: Filter!, cursor: String): UserFeed!
        user: User!
    }

    extend type Mutation {
        signUp(input: SignUpInput!): UserToken!
        logIn(input: LoginInput!): UserToken!
        updateUser(input: UpdateUserInput!): User!
        deleteUser: Boolean!
        restoreUser(input: RestoreUserInput!): User!
    }

    type User {
        id: Int!
        name: String!
        email: String!
        isDeleted: Boolean
        tasks: [Task!]
    }

    type UserFeed {
        userFeed:  [User!]
        pageInfo: PageInfo!
    }

    enum USER_ROLE_ENUM {
        USER
        ADMIN
    }

    input SignUpInput {
        name: String!
        email: String!
        password: String!
    }

    input LoginInput {
        email: String!
        password: String!
    }

    input RestoreUserInput {
        id: Int!
    }

    type UserToken {
        user: User!
        token: String!
    }

    input UpdateUserInput {
        name: String
        email: String
        password: String
        # role: USER_ROLE_ENUM
    }
`;
