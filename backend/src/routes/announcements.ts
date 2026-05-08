import type { Router } from "express";
import { z } from "zod";
import { asyncHandler, ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit-service.js";

const announcementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  category: z.enum(["event", "notice", "vacancy", "program"]),
  event_date: z.string().optional().nullable(),
  event_time: z.string().optional().nullable(),
  venue: z.string().optional().nullable()
});

const querySchema = z.object({
  category: z.enum(["event", "notice", "vacancy", "program"]).optional()
});

export function registerAnnouncementRoutes(router: Router) {
  router.get(
    "/",
    requireAuth,
    asyncHandler(async (request, response) => {
      const query = querySchema.parse(request.query);
      const announcements = await prisma.announcement.findMany({
        where: {
          branch_id: request.auth!.branchId ?? undefined,
          category: query.category
        },
        include: {
          postedBy: {
            select: {
              first_name: true,
              last_name: true,
              profile_photo_url: true
            }
          }
        },
        orderBy: {
          created_at: "desc"
        }
      });

      response.json({ announcements });
    })
  );

  router.get(
    "/:id",
    requireAuth,
    asyncHandler(async (request, response) => {
      const id = String(request.params.id);
      const announcement = await prisma.announcement.findUnique({
        where: { id },
        include: {
          postedBy: {
            select: {
              first_name: true,
              last_name: true,
              profile_photo_url: true
            }
          }
        }
      });

      if (!announcement) {
        throw new ApiError(404, "Announcement not found.");
      }

      response.json({ announcement });
    })
  );

  router.post(
    "/",
    requireAuth,
    requireRoles(["president", "vice_president", "secretary", "financial_secretary"]),
    asyncHandler(async (request, response) => {
      const payload = announcementSchema.parse(request.body);
      
      const announcement = await prisma.announcement.create({
        data: {
          title: payload.title,
          body: payload.body,
          category: payload.category,
          event_date: payload.event_date ? new Date(payload.event_date) : null,
          event_time: payload.event_time ?? null,
          venue: payload.venue ?? null,
          posted_by: request.auth!.memberId,
          branch_id: request.auth!.branchId
        }
      });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "CREATE",
        entityType: "Announcement",
        entityId: announcement.id,
        after: announcement,
        ipAddress: request.ip
      });

      response.status(201).json({ announcement });
    })
  );

  router.put(
    "/:id",
    requireAuth,
    requireRoles(["president", "vice_president", "secretary", "financial_secretary"]),
    asyncHandler(async (request, response) => {
      const id = String(request.params.id);
      const payload = announcementSchema.parse(request.body);

      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, "Announcement not found.");

      // Security: Only creator or high admin can edit
      if (existing.posted_by !== request.auth!.memberId && request.auth!.role !== "president") {
        throw new ApiError(403, "You can only edit announcements you posted.");
      }

      const announcement = await prisma.announcement.update({
        where: { id },
        data: {
          title: payload.title,
          body: payload.body,
          category: payload.category,
          event_date: payload.event_date ? new Date(payload.event_date) : null,
          event_time: payload.event_time ?? null,
          venue: payload.venue ?? null
        }
      });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "UPDATE",
        entityType: "Announcement",
        entityId: announcement.id,
        before: existing,
        after: announcement,
        ipAddress: request.ip
      });

      response.json({ announcement });
    })
  );

  router.delete(
    "/:id",
    requireAuth,
    requireRoles(["president", "vice_president", "secretary", "financial_secretary"]),
    asyncHandler(async (request, response) => {
      const id = String(request.params.id);
      
      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, "Announcement not found.");

      // Security: Only creator or high admin can delete
      if (existing.posted_by !== request.auth!.memberId && request.auth!.role !== "president") {
        throw new ApiError(403, "You can only delete announcements you posted.");
      }

      await prisma.announcement.delete({ where: { id } });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "DELETE",
        entityType: "Announcement",
        entityId: id,
        before: existing,
        ipAddress: request.ip
      });

      response.status(204).end();
    })
  );
}
