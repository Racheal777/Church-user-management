import type { Router } from "express";

import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { auditViewers } from "../utils/permissions.js";

export function registerAuditRoutes(router: Router) {
  router.get(
    "/",
    requireAuth,
    requireRoles(auditViewers),
    asyncHandler(async (request, response) => {
      const logs = await prisma.auditLog.findMany({
        where: {
          entity_type: request.query.entityType ? String(request.query.entityType) : undefined,
          actor_id: request.query.actorId ? String(request.query.actorId) : undefined
        },
        include: {
          actor: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              role: true
            }
          }
        },
        orderBy: { created_at: "desc" },
        take: 200
      });

      response.json({
        logs: logs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entity_type,
          entityId: log.entity_id,
          changes: log.changes,
          ipAddress: log.ip_address,
          createdAt: log.created_at,
          actor: {
            id: log.actor.id,
            firstName: log.actor.first_name,
            lastName: log.actor.last_name,
            role: log.actor.role
          }
        }))
      });
    })
  );
}
