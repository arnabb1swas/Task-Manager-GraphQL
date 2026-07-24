import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CREATE_TASK, UPDATE_TASK } from "@/graphql/mutations";
import { STATUS_COLUMNS } from "@/types";
import type {
  CreateTaskData,
  CreateTaskVars,
  Task,
  TaskStatus,
  UpdateTaskData,
  UpdateTaskVars,
} from "@/types";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  task?: Task;
  parentTaskId?: number;
}

export const TaskDialog = ({ open, onOpenChange, mode, task, parentTaskId }: TaskDialogProps) => {
  const [title, setTitle] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("TODO");

  // Reset the local form whenever the dialog opens (or the target task
  // changes) so stale values from a previous edit never leak into the next
  // create/edit pass.
  useEffect(() => {
    if (mode === "edit" && task) {
      setTitle(task.title);
      setTaskStatus(task.taskStatus);
    } else {
      setTitle("");
      setTaskStatus("TODO");
    }
  }, [open, task, mode]);

  // A created task/sub-task isn't in any cached list yet, so an entity-only
  // update wouldn't surface it on the board. Evicting the whole userTasks
  // field (every search/sort keyArgs variant) forces every active view to
  // refetch fresh, rather than refetchQueries which only refreshes the
  // currently-active variables and leaves other filtered variants stale.
  // Note this intentionally resets the board to the first page (any pages
  // loaded via "Load more" collapse back to 20).
  const [createTask, { loading: creating }] = useMutation<CreateTaskData, CreateTaskVars>(
    CREATE_TASK,
    {
      update(cache) {
        cache.evict({ id: "ROOT_QUERY", fieldName: "userTasks" });
        cache.gc();
      },
    },
  );

  // The mutation response includes id/title/taskStatus with __typename
  // "Task", so Apollo normalizes the change onto the existing Task:<id>
  // entity — the card updates in place with no refetch, so pagination state
  // (e.g. pages loaded via "Load more") is left untouched.
  const [updateTask, { loading: updating }] = useMutation<UpdateTaskData, UpdateTaskVars>(
    UPDATE_TASK,
  );

  const isLoading = creating || updating;
  const trimmedTitle = title.trim();

  const handleSubmit = async () => {
    if (!trimmedTitle) {
      return;
    }

    try {
      if (mode === "create") {
        await createTask({
          variables: {
            input: {
              title: trimmedTitle,
              taskStatus,
              ...(parentTaskId ? { parentTaskId } : {}),
            },
          },
        });
        toast.success(parentTaskId ? "Sub-task created" : "Task created");
      } else if (task) {
        await updateTask({
          variables: { input: { id: task.id, title: trimmedTitle, taskStatus } },
        });
        toast.success("Task updated");
      }

      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save task");
    }
  };

  let dialogTitle: string;

  if (mode === "edit") {
    dialogTitle = "Edit task";
  } else if (parentTaskId) {
    dialogTitle = "Add sub-task";
  } else {
    dialogTitle = "New task";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-title" className="text-sm font-medium text-foreground">
              Title
            </label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task title"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-status" className="text-sm font-medium text-foreground">
              Status
            </label>
            <Select
              value={taskStatus}
              onValueChange={(value) => setTaskStatus(value as TaskStatus)}
            >
              <SelectTrigger id="task-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLUMNS.map((column) => (
                  <SelectItem key={column.status} value={column.status}>
                    {column.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isLoading || !trimmedTitle}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
