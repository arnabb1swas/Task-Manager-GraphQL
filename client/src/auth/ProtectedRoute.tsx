import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ requireAdmin }: ProtectedRouteProps) => {
  const { token, role } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && role !== "ADMIN") {
    return <Navigate to="/board" replace />;
  }

  return <Outlet />;
};
