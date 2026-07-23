import { DndContext, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";

import { Badge } from "@/components/ui/badge";
import { TaskCard } from "@/components/board/TaskCard";
import { useUpdateTaskStatus } from "@/hooks/useUpdateTaskStatus";
import { STATUS_COLUMNS } from "@/types";
import type { Task, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubTask: (parentTask: Task) => void;
}

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAddSubTask: (parentTask: Task) => void;
}

// One droppable column. Extracted since it's rendered 3x (TODO/IN_PROGRESS/
// COMPLETED) and carries its own useDroppable hook.
const KanbanColumn = ({ status, label, tasks, onEdit, onDelete, onAddSubTask }: KanbanColumnProps) => {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-40 flex-col gap-3 rounded-xl bg-muted/40 p-3 transition-colors",
        isOver && "bg-muted",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium text-foreground">{label}</h2>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddSubTask={onAddSubTask}
          />
        ))}
      </div>
    </div>
  );
};

export const KanbanBoard = ({ tasks, onEdit, onDelete, onAddSubTask }: KanbanBoardProps) => {
  const { changeStatus } = useUpdateTaskStatus();

  // A small activation distance lets a plain click still register (open the
  // dropdown, expand sub-tasks) instead of every pointerdown starting a drag.
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const sensors = useSensors(pointerSensor);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const task = tasks.find((item) => item.id === active.id);
    const newStatus = over.id as TaskStatus;

    if (!task || task.taskStatus === newStatus) {
      return;
    }

    void changeStatus(task, newStatus);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STATUS_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            tasks={tasks.filter((task) => task.taskStatus === column.status)}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddSubTask={onAddSubTask}
          />
        ))}
      </div>
    </DndContext>
  );
};
