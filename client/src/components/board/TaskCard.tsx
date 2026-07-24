import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDownIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubTaskList } from "@/components/board/SubTaskList";
import { STATUS_LABEL } from "@/types";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubTask: (parentTask: Task) => void;
}

// Controls (expand chevron, ⋯ menu) sit inside the draggable card, so their
// pointerdown must never reach the card's drag listeners — otherwise every
// click on them would also start (or fight with) a drag gesture.
const stopPointerDown = (event: ReactPointerEvent) => {
  event.stopPropagation();
};

export const TaskCard = ({ task, onEdit, onDelete, onAddSubTask }: TaskCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const hasSubTasks = Boolean(task.subTasks && task.subTasks.length > 0);

  // Hand-rolled translate string — @dnd-kit/utilities' CSS helper isn't a
  // declared dependency (only pulled in transitively), so avoid importing it.
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={isDragging ? "cursor-grabbing opacity-50" : "cursor-grab"}
      {...attributes}
      {...listeners}
    >
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {hasSubTasks ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onPointerDown={stopPointerDown}
              onClick={(event) => {
                event.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            >
              {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </Button>
          ) : null}
          <CardTitle>{task.title}</CardTitle>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" onPointerDown={stopPointerDown}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddSubTask(task)}>Add sub-task</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <Badge variant="outline">{STATUS_LABEL[task.taskStatus]}</Badge>
        {isExpanded && hasSubTasks ? (
          <SubTaskList task={task} onAddSubTask={onAddSubTask} />
        ) : null}
      </CardContent>
    </Card>
  );
};
