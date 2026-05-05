import type { MemberRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        memberId: string;
        role: MemberRole;
        branchId: string | null;
      };
    }
  }
}

export {};
