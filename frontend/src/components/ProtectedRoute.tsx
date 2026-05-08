import { Navigate, Outlet } from "react-router-dom";

import { Loader } from "./Loader";
import type { Permissions } from "../lib/api";
import { useAuth } from "../providers/AuthContext";

export function ProtectedRoute({ permission, adminOnly = false }: { permission?: keyof Permissions; adminOnly?: boolean }) {
  const { member, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader label="Loading your space..." />
      </div>
    );
  }

  if (!member) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !member.permissions[permission]) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !member.permissions.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
