import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL } from "@/types";
import type { Task } from "@/types";

interface SubTaskListProps {
  task: Task;
  onAddSubTask: (parentTask: Task) => void;
}

export const SubTaskList = ({ task, onAddSubTask }: SubTaskListProps) => {
  const subTasks = task.subTasks ?? [];

  return (
    <div className="ml-4 flex flex-col gap-1.5 border-l border-border pl-3">
      {subTasks.map((subTask) => (
        <div key={subTask.id} className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground">{subTask.title}</span>
          <Badge variant="outline">{STATUS_LABEL[subTask.taskStatus]}</Badge>
        </div>
      ))}

      <Button variant="ghost" size="sm" className="w-fit" onClick={() => onAddSubTask(task)}>
        + Add sub-task
      </Button>
    </div>
  );
};
