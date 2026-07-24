import { gql } from "@apollo/client";

// Current authenticated user (role is read from the JWT, not this query).
export const ME = gql`
  query Me {
    user {
      id
      name
      email
    }
  }
`;

export const USER_TASKS = gql`
  query UserTasks($filter: Filter!, $cursor: String) {
    userTasks(filter: $filter, cursor: $cursor) {
      taskFeed {
        id
        title
        taskStatus
        subTasks {
          id
          title
          taskStatus
        }
      }
      pageInfo {
        hasNextPage
        nextPageCursor
      }
    }
  }
`;

// Admin-only directory of all users, with their tasks (count = tasks.length).
export const USERS = gql`
  query Users($filter: Filter!, $cursor: String) {
    users(filter: $filter, cursor: $cursor) {
      userFeed {
        id
        name
        email
        isDeleted
        tasks {
          id
        }
      }
      pageInfo {
        hasNextPage
        nextPageCursor
      }
    }
  }
`;
