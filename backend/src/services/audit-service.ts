import type { AuditAction } from "@prisma/client";

import { prisma } from "../lib/prisma.js";

type AuditInput = {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
};

export async function logAuditEvent(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      changes: {
        before: input.before ?? null,
        after: input.after ?? null
      },
      ip_address: input.ipAddress ?? "unknown"
    }
  });
}
