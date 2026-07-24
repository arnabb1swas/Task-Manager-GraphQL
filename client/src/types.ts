// Shared task domain types + the small set of query/mutation shapes reused
// across Board, KanbanBoard, ListView, TaskCard, and SubTaskList — kept in
// one place so no component redeclares them.

export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";

export interface Task {
  id: number;
  title: string;
  taskStatus: TaskStatus;
  subTasks?: Task[];
}

// Status columns in board order, each paired with its human label. Both the
// Kanban columns and the List view groupings/filter chips iterate this.
export const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "TODO", label: "To Do" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "COMPLETED", label: "Completed" },
];

// Quick status -> label lookup, derived from STATUS_COLUMNS so the two never
// drift out of sync.
export const STATUS_LABEL: Record<TaskStatus, string> = STATUS_COLUMNS.reduce(
  (labels, column) => ({ ...labels, [column.status]: column.label }),
  {} as Record<TaskStatus, string>,
);

export type SortBy = "ASC" | "DESC";

// Mirrors the server's `Filter` input — `hasDeleted` and `sortBy` are
// required there, `searchText`/`limit` are optional.
export interface UserTasksFilter {
  hasDeleted: boolean;
  sortBy: SortBy;
  limit?: number;
  searchText?: string;
}

export interface UserTasksVars {
  filter: UserTasksFilter;
  cursor?: string;
}

export interface UserTasksData {
  userTasks: {
    taskFeed: Task[] | null;
    pageInfo: { hasNextPage: boolean | null; nextPageCursor: string | null };
  };
}

// Admin-only user directory row — mirrors the `UserTasks*` shapes above but
// for the `users` query (task count = `tasks?.length ?? 0`).
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  isDeleted: boolean | null;
  tasks: { id: number }[] | null;
}

export interface UsersData {
  users: {
    userFeed: AdminUser[] | null;
    pageInfo: { hasNextPage: boolean | null; nextPageCursor: string | null };
  };
}

export interface UsersVars {
  filter: UserTasksFilter;
  cursor?: string;
}

export interface UpdateTaskInput {
  id: number;
  title?: string;
  taskStatus?: TaskStatus;
}

export interface UpdateTaskVars {
  input: UpdateTaskInput;
}

// Matches the UPDATE_TASK selection set (id, title, taskStatus) plus the
// __typename an optimisticResponse needs so Apollo normalizes it onto the
// same `Task:<id>` cache entity as the real response.
export interface UpdateTaskData {
  updateTask: Task & { __typename: "Task" };
}

// Mirrors the server's `CreateTaskInput` — `parentTaskId`, when present,
// creates the new task as a sub-task of that parent.
export interface CreateTaskInput {
  title: string;
  taskStatus: TaskStatus;
  parentTaskId?: number;
}

export interface CreateTaskVars {
  input: CreateTaskInput;
}

// Matches the CREATE_TASK selection set (id, title, taskStatus). A created
// task/sub-task isn't in any existing cached list, so TaskDialog refetches
// UserTasks instead of relying on this response for cache placement.
export interface CreateTaskData {
  createTask: Task;
}

export interface DeleteTaskInput {
  id: number;
}

export interface DeleteTaskVars {
  input: DeleteTaskInput;
}

export interface DeleteTaskData {
  deleteTask: { id: number };
}

// Admin-only: reverses a soft-deleted user. Matches the RESTORE_USER selection
// set plus __typename so Apollo normalizes the change onto the User:<id> entity.
export interface RestoreUserVars {
  input: { id: number };
}

export interface RestoreUserData {
  restoreUser: {
    __typename: "User";
    id: number;
    name: string;
    email: string;
    isDeleted: boolean | null;
  };
}
