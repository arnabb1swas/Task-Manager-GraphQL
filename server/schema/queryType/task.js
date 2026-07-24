import gql from "graphql-tag";

export default gql`
    extend type Query {
        tasks(filter: Filter!, cursor: String): TaskFeed!
        userTasks(filter: Filter!, cursor: String): TaskFeed!
        task(id: Int!): Task!
    }

    extend type Mutation {
        createTask(input: CreateTaskInput!): Task!
        updateTask(input: UpdateTaskInput!): Task!
        deleteTask(input: DeleteTaskInput!): Task!
    }

    enum TASK_STATUS_ENUM {
        TODO
        IN_PROGRESS
        COMPLETED
    }

    type Task {
        id: Int!
        title: String!
        taskStatus: TASK_STATUS_ENUM!
        user: User!
        subTasks: [Task!]
    }

    type TaskFeed {
        taskFeed:  [Task!]
        pageInfo: PageInfo!
    }

    input CreateTaskInput {
        title: String!
        taskStatus: TASK_STATUS_ENUM!
        parentTaskId: Int
    }

    input UpdateTaskInput {
        id: Int!
        title: String
        taskStatus: TASK_STATUS_ENUM
        parentTaskId: ID
    }

    input DeleteTaskInput {
        id: Int!
    }
`;
