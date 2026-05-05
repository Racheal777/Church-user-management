import type { Router } from "express";

import { z } from "zod";

import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit-service.js";
import { ensureDefaultBranch } from "../services/branch-service.js";
import { memberManagers } from "../utils/permissions.js";

const teamSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#([A-Fa-f0-9]{6})$/)
});

export function registerTeamRoutes(router: Router) {
  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      const teams = await prisma.team.findMany({
        include: {
          _count: {
            select: { members: true }
          }
        },
        orderBy: { name: "asc" }
      });

      response.json({
        teams: teams.map((team) => ({
          id: team.id,
          name: team.name,
          color: team.color,
          memberCount: team._count.members
        }))
      });
    })
  );

  router.post(
    "/",
    requireAuth,
    requireRoles(memberManagers),
    asyncHandler(async (request, response) => {
      const payload = teamSchema.parse(request.body);
      const branch = await ensureDefaultBranch();
      const team = await prisma.team.create({
        data: {
          name: payload.name,
          color: payload.color,
          branch_id: request.auth!.branchId ?? branch.id
        }
      });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "CREATE",
        entityType: "Team",
        entityId: team.id,
        after: team,
        ipAddress: request.ip
      });

      response.status(201).json({ team });
    })
  );

  router.put(
    "/:id",
    requireAuth,
    requireRoles(memberManagers),
    asyncHandler(async (request, response) => {
      const teamId = String(request.params.id);
      const payload = teamSchema.partial().parse(request.body);
      const before = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
      const team = await prisma.team.update({
        where: { id: teamId },
        data: {
          name: payload.name,
          color: payload.color
        }
      });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "UPDATE",
        entityType: "Team",
        entityId: team.id,
        before,
        after: team,
        ipAddress: request.ip
      });

      response.json({ team });
    })
  );
}
