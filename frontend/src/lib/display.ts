import type { Member } from "./api";

export function formatRoleLabel(role: Member["role"]) {
  return role.replace(/_/g, " ");
}

export function calculateProfileCompletion(member: Pick<Member, "email" | "whatsappNumber" | "profilePhotoUrl" | "dateOfBirth">) {
  const filled = [member.email, member.whatsappNumber, member.profilePhotoUrl, member.dateOfBirth].filter(Boolean).length;
  return Math.round(((2 + filled) / 6) * 100);
}
