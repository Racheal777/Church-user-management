import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthContext";
import { AdminDashboard } from "./AdminDashboard";
import { MemberDashboard } from "./MemberDashboard";

export function HomePage() {
  const { member, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !member) {
      navigate("/login", { replace: true });
    }
  }, [member, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
      </div>
    );
  }

  if (!member) {
    return null;
  }

  if (member.permissions.isAdmin) {
    return <AdminDashboard />;
  }

  return <MemberDashboard />;
}
