import { useState } from "react";
import { MoreHorizontalIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateTaskStatus } from "@/hooks/useUpdateTaskStatus";
import { STATUS_COLUMNS, STATUS_LABEL } from "@/types";
import type { Task, TaskStatus } from "@/types";

interface ListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubTask: (parentTask: Task) => void;
}

export const ListView = ({ tasks, onEdit, onDelete, onAddSubTask }: ListViewProps) => {
  const { changeStatus } = useUpdateTaskStatus();

  // Every status starts visible; toggling a chip hides that group client-side.
  const [hiddenStatuses, setHiddenStatuses] = useState<TaskStatus[]>([]);

  const toggleStatus = (status: TaskStatus) => {
    setHiddenStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
    );
  };

  const visibleColumns = STATUS_COLUMNS.filter((column) => !hiddenStatuses.includes(column.status));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {STATUS_COLUMNS.map((column) => {
          const isHidden = hiddenStatuses.includes(column.status);

          return (
            <Badge
              key={column.status}
              variant={isHidden ? "outline" : "secondary"}
              className="cursor-pointer select-none"
              onClick={() => toggleStatus(column.status)}
            >
              {column.label}
            </Badge>
          );
        })}
      </div>

      {visibleColumns.map((column) => {
        const columnTasks = tasks.filter((task) => task.taskStatus === column.status);

        return (
          <div key={column.status} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-foreground">{column.label}</h2>
              <Badge variant="outline">{columnTasks.length}</Badge>
            </div>

            {columnTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks in this status.</p>
            ) : null}

            {columnTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <span className="text-sm text-foreground">{task.title}</span>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge variant="outline" className="cursor-pointer">
                        {STATUS_LABEL[task.taskStatus]}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {STATUS_COLUMNS.map((option) => (
                        <DropdownMenuItem
                          key={option.status}
                          onClick={() => void changeStatus(task, option.status)}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAddSubTask(task)}>
                        Add sub-task
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
