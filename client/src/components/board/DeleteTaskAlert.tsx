import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DELETE_TASK } from "@/graphql/mutations";
import type { DeleteTaskData, DeleteTaskVars, Task } from "@/types";

interface DeleteTaskAlertProps {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
}

// Confirms before deleting a task (or sub-task). Driven by `task`: null means
// closed, a Task means "confirm deleting this one".
export const DeleteTaskAlert = ({ task, onOpenChange }: DeleteTaskAlertProps) => {
  // `task` goes null the instant the dialog starts closing (confirm or
  // cancel), but the alert plays an exit animation — keep the last non-null
  // task around locally so the description doesn't flash `delete ""` while
  // that animation plays.
  const [lastTask, setLastTask] = useState<Task | null>(task);

  if (task !== null && task !== lastTask) {
    setLastTask(task);
  }

  const displayTask = task ?? lastTask;
  const hasSubTasks = Boolean(displayTask?.subTasks && displayTask.subTasks.length > 0);

  // Deleting a task removes it from every cached `userTasks` page. Evicting
  // the normalized entity (rather than refetching) drops it from all of
  // those pages in one shot without disturbing pagination/cursor state.
  const [deleteTask, { loading }] = useMutation<DeleteTaskData, DeleteTaskVars>(DELETE_TASK, {
    update(cache) {
      if (!task) {
        return;
      }

      cache.evict({ id: cache.identify({ __typename: "Task", id: task.id }) });
      cache.gc();
    },
  });

  const handleConfirm = async () => {
    if (!task) {
      return;
    }

    try {
      await deleteTask({ variables: { input: { id: task.id } } });
      toast.success("Task deleted");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  return (
    <AlertDialog open={task !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete task</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{displayTask?.title}&quot;
            {hasSubTasks ? " and its sub-tasks" : ""}. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={loading} onClick={() => void handleConfirm()}>
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
