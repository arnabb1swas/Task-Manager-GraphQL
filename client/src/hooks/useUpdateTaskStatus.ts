import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import { UPDATE_TASK } from "@/graphql/mutations";
import type { Task, TaskStatus, UpdateTaskData, UpdateTaskVars } from "@/types";

// Shared by KanbanBoard (drag-and-drop) and ListView (inline status change) —
// both move a task to a new status with the same optimistic-update pattern.
// Apollo v4 normalizes `Task` by `id`, so returning the updated entity here
// moves the card/row instantly with no manual cache writes; on error Apollo
// rolls the optimistic write back automatically and we surface a toast.
export const useUpdateTaskStatus = () => {
  const [updateTask] = useMutation<UpdateTaskData, UpdateTaskVars>(UPDATE_TASK);

  const changeStatus = async (task: Task, taskStatus: TaskStatus) => {
    try {
      await updateTask({
        variables: { input: { id: task.id, taskStatus } },
        optimisticResponse: {
          updateTask: { __typename: "Task", id: task.id, title: task.title, taskStatus },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task status");
    }
  };

  return { changeStatus };
};
