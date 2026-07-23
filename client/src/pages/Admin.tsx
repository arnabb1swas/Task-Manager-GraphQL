import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";

import { useAuth } from "@/auth/AuthContext";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { USERS } from "@/graphql/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { UsersData, UsersVars } from "@/types";

// Fixed row count keeps the skeleton table from flashing at a wildly
// different height than the real one once rows arrive.
const SKELETON_ROW_COUNT = 5;

// Read-only admin directory: every user, their email, and their task count.
// Role gating happens in the route guard (ProtectedRoute requireAdmin) — no
// re-check needed here.
const Admin = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Same debounce pattern as Board — avoid firing a query per keystroke.
  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebouncedValue(searchInput, 300);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filter: UsersVars["filter"] = {
    hasDeleted: false,
    sortBy: "ASC",
    limit: 20,
    ...(searchText ? { searchText } : {}),
  };

  const { data, loading, fetchMore } = useQuery<UsersData, UsersVars>(USERS, {
    variables: { filter },
  });

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.tasks?.length ?? 0}</TableCell>
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
