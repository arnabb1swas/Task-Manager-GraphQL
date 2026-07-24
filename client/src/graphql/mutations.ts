import { gql } from "@apollo/client";

export const SIGN_UP = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

export const LOG_IN = gql`
  mutation LogIn($input: LoginInput!) {
    logIn(input: $input) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

export const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      taskStatus
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($input: UpdateTaskInput!) {
    updateTask(input: $input) {
      id
      title
      taskStatus
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($input: DeleteTaskInput!) {
    deleteTask(input: $input) {
      id
    }
  }
`;

export const RESTORE_USER = gql`
  mutation RestoreUser($input: RestoreUserInput!) {
    restoreUser(input: $input) {
      id
      name
      email
      isDeleted
    }
  }
`;
