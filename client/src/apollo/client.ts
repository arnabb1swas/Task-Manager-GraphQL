import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";

import type { UserTasksData, UsersData } from "@/types";

// The shape cached under the `userTasks` field — used to type the merge
// function below without resorting to `any`.
type UserTasksFeed = UserTasksData["userTasks"];

// Same idea for the admin-only `users` field.
type UsersFeed = UsersData["users"];

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:4000/graphql",
});

// Apollo Client 4 replaced the `setContext` helper with the `SetContextLink`
// class — the behavior (attach a bearer token from localStorage) is identical.
const authLink = new SetContextLink(({ headers }) => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

// The server throws on `jwt.verify` failure (expired/invalid token) — that
// surfaces here as either a GraphQL error (code UNAUTHENTICATED, or a
// message mentioning jwt/authorised) or a raw 401 network response. Either
// way the token is dead, so drop it and hard-redirect to /login: the link
// chain has no router access, and clearing localStorage + reloading is the
// simplest way to guarantee every in-flight query/component resets.
const isAuthError = (error: unknown): boolean => {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.some((graphQLError) => {
      const code = graphQLError.extensions?.code;

      if (code === "UNAUTHENTICATED") {
        return true;
      }

      return /jwt|not authorised|unauthenticated/i.test(graphQLError.message);
    });
  }

  if (ServerError.is(error)) {
    return error.statusCode === 401;
  }

  return false;
};

const errorLink = new ErrorLink(({ error }) => {
  if (!isAuthError(error)) {
    return;
  }

  // Guard against a redirect loop — the login page itself has no token to
  // expire, so never bounce it back to itself.
  if (window.location.pathname === "/login") {
    return;
  }

  localStorage.removeItem("token");
  void apolloClient.clearStore();
  window.location.assign("/login");
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          userTasks: {
            // A distinct cached list per search/sort/deleted combo (NOT per
            // cursor) — so changing the search term is a fresh list, while
            // paging the same search appends.
            keyArgs: ["filter", ["searchText", "sortBy", "hasDeleted"]],
            merge(
              existing: UserTasksFeed | undefined,
              incoming: UserTasksFeed,
              { args }: { args?: { cursor?: string } | null },
            ): UserTasksFeed {
              // No cursor → first page (fresh load or a new search): replace.
              if (!args?.cursor) {
                return incoming;
              }

              // Subsequent page: append its taskFeed, keep the latest pageInfo.
              const existingFeed = existing?.taskFeed ?? [];
              const incomingFeed = incoming?.taskFeed ?? [];

              return {
                ...incoming,
                taskFeed: [...existingFeed, ...incomingFeed],
              };
            },
          },
          // Mirrors the userTasks policy above — a fresh list per
          // search/sort/deleted combo, appended across cursor pages.
          users: {
            keyArgs: ["filter", ["searchText", "sortBy", "hasDeleted"]],
            merge(
              existing: UsersFeed | undefined,
              incoming: UsersFeed,
              { args }: { args?: { cursor?: string } | null },
            ): UsersFeed {
              if (!args?.cursor) {
                return incoming;
              }

              const existingFeed = existing?.userFeed ?? [];
              const incomingFeed = incoming?.userFeed ?? [];

              return {
                ...incoming,
                userFeed: [...existingFeed, ...incomingFeed],
              };
            },
          },
        },
      },
    },
  }),
});
