import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";

import { useAuth } from "@/auth/AuthContext";
import { ModeToggle } from "@/components/ModeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { USERS } from "@/graphql/queries";
import { RESTORE_USER } from "@/graphql/mutations";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { RestoreUserData, RestoreUserVars, UsersData, UsersVars } from "@/types";

// Fixed row count keeps the skeleton table from flashing at a wildly
// different height than the real one once rows arrive.
const SKELETON_ROW_COUNT = 5;

// Admin directory: every user, their email, and their task count. Role gating
// happens in the route guard (ProtectedRoute requireAdmin) — no re-check here.
// Admins can also reveal soft-deleted users and undo the deletion.
const Admin = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Same debounce pattern as Board — avoid firing a query per keystroke.
  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebouncedValue(searchInput, 300);

  // When on, the list also includes soft-deleted users so they can be restored.
  const [showDeleted, setShowDeleted] = useState(false);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filter: UsersVars["filter"] = {
    hasDeleted: showDeleted,
    sortBy: "ASC",
    limit: 20,
    ...(searchText ? { searchText } : {}),
  };

  const { data, loading, fetchMore } = useQuery<UsersData, UsersVars>(USERS, {
    variables: { filter },
  });

  // restoreUser returns the User with isDeleted:false + __typename "User", so
  // Apollo normalizes it onto the existing User:<id> entity and the row's badge
  // flips in place — no refetch needed.
  const [restoreUser, { loading: restoring }] = useMutation<RestoreUserData, RestoreUserVars>(
    RESTORE_USER,
  );

  const users = data?.users.userFeed ?? [];
  const pageInfo = data?.users.pageInfo;

  // Same first-load-only rule as Board: don't blank the table during a
  // fetchMore, only before the first response has any `data` at all.
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

  const handleRestore = async (id: number, name: string) => {
    try {
      await restoreUser({ variables: { input: { id } } });
      toast.success(`Restored ${name}`);
    } catch {
      toast.error("Could not restore user");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-svh flex-col gap-4 bg-background p-4 text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search users…"
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showDeleted ? "default" : "outline"}
            onClick={() => setShowDeleted((prev) => !prev)}
          >
            {showDeleted ? "Hide deleted" : "Show deleted"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/board">Back to board</Link>
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
          <ModeToggle />
        </div>
      </header>

      {isInitialLoad ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="ml-auto h-4 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-12 text-center text-muted-foreground">
          {searchText ? (
            <p className="text-sm">No users match "{searchText}".</p>
          ) : (
            <p className="text-sm">No users found.</p>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.tasks?.length ?? 0}</TableCell>
                <TableCell>
                  {user.isDeleted ? (
                    <Badge variant="destructive">Deleted</Badge>
                  ) : (
                    <Badge variant="secondary">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {user.isDeleted ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={restoring}
                      onClick={() => handleRestore(user.id, user.name)}
                    >
                      Undo delete
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {pageInfo?.hasNextPage ? (
        <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore} className="self-center">
          {isLoadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
};

export default Admin;
