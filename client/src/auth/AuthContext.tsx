import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { apolloClient } from "@/apollo/client";

export type Role = "USER" | "ADMIN";

// Shape of the JWT payload issued by the server (see server/src auth code).
// The `user` GraphQL query intentionally omits `role`, so role must come
// from the token itself.
export interface DecodedUser {
  id: number;
  role: Role;
}

interface AuthContextValue {
  token: string | null;
  user: DecodedUser | null;
  role: Role | null;
  login: (token: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Narrows an arbitrary decoded payload down to the shape we actually rely
// on — a valid-JSON-but-wrong-shape token (e.g. `{}`) would otherwise be
// accepted, leaving `role` undefined while ProtectedRoute still sees a
// truthy token and renders a page with no real identity.
const isDecodedUser = (payload: unknown): payload is DecodedUser => {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.id === "number" &&
    (candidate.role === "USER" || candidate.role === "ADMIN")
  );
};

// Base64url-decodes the middle segment of a JWT into its payload.
// Returns null (rather than throwing) on any malformed/expired/wrong-shape
// token so callers can safely treat decode failure as "logged out".
const decodeToken = (token: string): DecodedUser | null => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as unknown;

    return isDecodedUser(payload) ? payload : null;
  } catch {
    return null;
  }
};

const readInitialState = (): { token: string | null; user: DecodedUser | null } => {
  const storedToken = localStorage.getItem("token");

  if (!storedToken) {
    return { token: null, user: null };
  }

  const decoded = decodeToken(storedToken);

  if (!decoded) {
    // Bad token can't crash the app — drop it and start logged out.
    localStorage.removeItem("token");

    return { token: null, user: null };
  }

  return { token: storedToken, user: decoded };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [{ token, user }, setAuthState] = useState(readInitialState);

  const login = useCallback((newToken: string) => {
    const decoded = decodeToken(newToken);

    if (!decoded) {
      // Same "invalid shape → logged out" treatment as readInitialState:
      // never persist a token we can't extract a real identity from, or
      // ProtectedRoute would see a truthy token and render pages anyway.
      localStorage.removeItem("token");
      setAuthState({ token: null, user: null });

      return;
    }

    localStorage.setItem("token", newToken);
    setAuthState({ token: newToken, user: decoded });
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem("token");
    await apolloClient.clearStore();
    setAuthState({ token: null, user: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      role: user?.role ?? null,
      login,
      logout,
    }),
    [token, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
