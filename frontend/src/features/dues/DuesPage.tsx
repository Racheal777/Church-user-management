import { Navigate } from "react-router-dom";

import { useAuth } from "../../providers/AuthContext";

export function DuesPage() {
  const { member } = useAuth();

  if (!member) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={member.permissions.canManageFinance ? "/manage-dues" : "/my-dues"} replace />;
}
