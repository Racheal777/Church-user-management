import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { MemberLayout } from "../components/MemberLayout";
import { PublicLayout } from "../components/PublicLayout";
import { SidebarLayout } from "../components/SidebarLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AttendanceManagerPage } from "../features/attendance/AttendanceManagerPage";
import { CheckInPage } from "../features/attendance/CheckInPage";
import { AttendanceHistoryPage } from "../features/attendance/AttendanceHistoryPage";
import { AuditLogsPage } from "../features/dashboard/AuditLogsPage";
import { HomePage } from "../features/dashboard/HomePage";
import { DirectoryPage } from "../features/directory/DirectoryPage";
import { DuesPage } from "../features/dues/DuesPage";
import { ManageDuesPage } from "../features/dues/ManageDuesPage";
import { MyDuesPage } from "../features/dues/MyDuesPage";
import { LoginPage } from "../features/auth/LoginPage";
import { MembersPage } from "../features/members/MembersPage";
import { MemberDetailPage } from "../features/members/MemberDetailPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { TeamsPage } from "../features/teams/TeamsPage";
import { ReportsPage } from "../features/dashboard/ReportsPage";
import { CriticalFollowupsPage } from "../features/dashboard/CriticalFollowupsPage";
import { AnnouncementsPage } from "../features/dashboard/AnnouncementsPage";
import { BirthdaysPage } from "../features/dashboard/BirthdaysPage";
import { useAuth } from "../providers/AuthContext";

function Root() {
  const { member } = useAuth();
  
  if (!member) {
    return <PublicLayout />;
  }

  return member.permissions.isAdmin ? <SidebarLayout /> : <MemberLayout />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "directory", element: <DirectoryPage /> },
      { path: "announcements", element: <AnnouncementsPage /> },
      { path: "birthdays", element: <BirthdaysPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "check-in", element: <CheckInPage /> },
          { path: "attendance-history", element: <AttendanceHistoryPage /> },
          { path: "dues", element: <DuesPage /> },
          { path: "my-dues", element: <MyDuesPage /> },
          { path: "profile", element: <ProfilePage /> }
        ]
      },
      {
        element: <ProtectedRoute permission="canManageFinance" />,
        children: [{ path: "manage-dues", element: <ManageDuesPage /> }]
      },
      {
        element: <ProtectedRoute permission="canManageAttendance" />,
        children: [{ path: "attendance", element: <AttendanceManagerPage /> }]
      },
      {
        element: <ProtectedRoute permission="canManageMembers" />,
        children: [
          { path: "members", element: <MembersPage /> },
          { path: "members/:id", element: <MemberDetailPage /> },
          { path: "teams", element: <TeamsPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "admin/critical-follow-ups", element: <CriticalFollowupsPage /> }
        ]
      },
      {
        element: <ProtectedRoute permission="canViewAuditLogs" />,
        children: [{ path: "admin/audit-logs", element: <AuditLogsPage /> }]
      }
    ]
  },
  { path: "/login", element: <LoginPage /> }
]);

export function App() {
  return <RouterProvider router={router} />;
}
