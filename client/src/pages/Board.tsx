import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";

import { useAuth } from "@/auth/AuthContext";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteTaskAlert } from "@/components/board/DeleteTaskAlert";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { ListView } from "@/components/board/ListView";
import { TaskDialog } from "@/components/board/TaskDialog";
import { USER_TASKS } from "@/graphql/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { STATUS_COLUMNS } from "@/types";
import type { Task, UserTasksData, UserTasksVars } from "@/types";

// Mirrors KanbanBoard's 3-column grid so the loading state doesn't jump the
// layout once real cards arrive. Only rendered on the very first load —
// Apollo v4's `loading` flag stays true only pre-first-response, so gating on
// `!data` (rather than `loading` alone) keeps a fetchMore from blanking the
// already-loaded list.
const BoardSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {STATUS_COLUMNS.map((column) => (
      <div key={column.status} className="flex min-h-40 flex-col gap-3 rounded-xl bg-muted/40 p-3">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-8" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    ))}
  </div>
);

// A single state slot drives TaskDialog for all three of its entry points:
// the "New Task" button, editing an existing task, and adding a sub-task
// under a parent (which only differs by carrying a parentTaskId).
type DialogState = { mode: "create"; parentTaskId?: number } | { mode: "edit"; task: Task } | null;

const Board = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // The raw input updates on every keystroke; searchText only follows it
  // once typing pauses for 300ms, so the query doesn't fire per-keystroke.
  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebouncedValue(searchInput, 300);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filter: UserTasksVars["filter"] = {
    hasDeleted: false,
    sortBy: "ASC",
    limit: 20,
    ...(searchText ? { searchText } : {}),
  };

  const { data, loading, fetchMore } = useQuery<UserTasksData, UserTasksVars>(USER_TASKS, {
    variables: { filter },
  });

  const tasks: Task[] = data?.userTasks.taskFeed ?? [];
  const pageInfo = data?.userTasks.pageInfo;

  // Show skeletons only for the very first load — once `data` exists, a later
  // fetchMore keeps `loading` true too, but the list should stay visible.
  const isInitialLoad = loading && !data;

  const handleLoadMore = async () => {
    if (!pageInfo?.nextPageCursor) {
      return;
    }

    setIsLoadingMore(true);

    try {
      await fetchMore({ variables: { filter, cursor: pageInfo.nextPageCursor } });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleEdit = (task: Task) => {
    setDialog({ mode: "edit", task });
  };

  const handleDelete = (task: Task) => {
    setTaskToDelete(task);
  };

  const handleAddSubTask = (parentTask: Task) => {
    setDialog({ mode: "create", parentTaskId: parentTask.id });
  };

  return (
    <div className="flex min-h-svh flex-col gap-4 bg-background p-4 text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Task Board</h1>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search tasks…"
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog({ mode: "create" })}>New Task</Button>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
          <ModeToggle />
        </div>
      </header>

      <TaskDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
          }
        }}
        mode={dialog?.mode ?? "create"}
        task={dialog?.mode === "edit" ? dialog.task : undefined}
        parentTaskId={dialog?.mode === "create" ? dialog.parentTaskId : undefined}
      />

      <DeleteTaskAlert
        task={taskToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setTaskToDelete(null);
          }
        }}
      />

      {isInitialLoad ? (
        <BoardSkeleton />
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-12 text-center text-muted-foreground">
          {searchText ? (
            <p className="text-sm">No tasks match "{searchText}".</p>
          ) : (
            <>
              <p className="text-sm">No tasks yet.</p>
              <p className="text-xs">Click "New Task" to create your first one.</p>
            </>
          )}
        </div>
      ) : (
        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>

          <TabsContent value="board">
            <KanbanBoard
              tasks={tasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddSubTask={handleAddSubTask}
            />
          </TabsContent>
          <TabsContent value="list">
            <ListView
              tasks={tasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddSubTask={handleAddSubTask}
            />
          </TabsContent>
        </Tabs>
      )}

      {pageInfo?.hasNextPage ? (
        <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore} className="self-center">
          {isLoadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
};

export default Board;
