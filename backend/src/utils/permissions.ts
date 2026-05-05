import type { MemberRole } from "@prisma/client";

export const memberManagers: MemberRole[] = ["president", "vice_president", "secretary"];
export const attendanceManagers: MemberRole[] = ["president", "vice_president", "secretary"];
export const financeManagers: MemberRole[] = [
  "president",
  "vice_president",
  "financial_secretary"
];
export const auditViewers: MemberRole[] = ["president", "vice_president"];
export const adminRoles: MemberRole[] = [
  "president",
  "vice_president",
  "secretary",
  "financial_secretary"
];

export function isAdminRole(role: MemberRole) {
  return adminRoles.includes(role);
}

export function buildPermissions(role: MemberRole) {
  return {
    canManageMembers: memberManagers.includes(role),
    canManageAttendance: attendanceManagers.includes(role),
    canManageFinance: financeManagers.includes(role),
    canViewAuditLogs: auditViewers.includes(role),
    isAdmin: isAdminRole(role)
  };
}
