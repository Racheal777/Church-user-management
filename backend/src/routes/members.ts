import crypto from "node:crypto";

import type { Prisma } from "@prisma/client";
import type { Router } from "express";

import { z } from "zod";

import { env } from "../config/env.js";
import { asyncHandler, ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { optionalAuth, requireAuth, requireRoles } from "../middleware/auth.js";
import { mediaProvider } from "../providers/media.js";
import { smsProvider } from "../providers/sms.js";
import { logAuditEvent } from "../services/audit-service.js";
import { ensureDefaultBranch } from "../services/branch-service.js";
import { generateWeeklyDues } from "../services/dues-scheduler.js";
import { buildDuesLedger } from "../services/dues-service.js";
import { buildPermissions, isAdminRole, memberManagers } from "../utils/permissions.js";
import { normalizePhoneNumber } from "../utils/phone.js";

const publicQuerySchema = z.object({
  search: z.string().optional(),
  teamId: z.string().uuid().optional()
});

const adminQuerySchema = z.object({
  search: z.string().optional(),
  teamId: z.string().uuid().optional(),
  role: z
    .enum([
      "president",
      "vice_president",
      "secretary",
      "financial_secretary",
      "team_lead",
      "member"
    ])
    .optional(),
  activeStatus: z.enum(["active", "inactive", "all"]).optional()
});

const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(8),
  whatsappNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional().nullable(),
  dateJoined: z.string().optional().nullable(),
  profilePhotoUrl: z.string().url().optional().nullable(),
  role: z.enum([
    "president",
    "vice_president",
    "secretary",
    "financial_secretary",
    "team_lead",
    "member"
  ]),
  teamId: z.string().uuid().optional().nullable()
});

const adminUpdateSchema = createMemberSchema.partial();
const selfUpdateSchema = z.object({
  whatsappNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional().nullable(),
  profilePhotoUrl: z.string().url().optional().nullable(),
  dateOfBirth: z.string().optional().nullable()
});

function memberSearchWhere(search?: string): Prisma.MemberWhereInput | undefined {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { first_name: { contains: search, mode: "insensitive" } },
      { last_name: { contains: search, mode: "insensitive" } },
      { phone_number: { contains: search, mode: "insensitive" } }
    ]
  };
}

type MemberWithTeam = Prisma.MemberGetPayload<{ include: { team: true } }>;

function serializePublicMember(member: MemberWithTeam) {
  return {
    id: member.id,
    firstName: member.first_name,
    lastName: member.last_name,
    profilePhotoUrl: member.profile_photo_url,
    role: member.role,
    team: member.team
      ? {
          id: member.team.id,
          name: member.team.name,
          color: member.team.color
        }
      : null
  };
}

function serializePrivateMember(member: MemberWithTeam) {
  return {
    id: member.id,
    firstName: member.first_name,
    lastName: member.last_name,
    phoneNumber: member.phone_number,
    whatsappNumber: member.whatsapp_number,
    email: member.email,
    dateOfBirth: member.date_of_birth,
    maritalStatus: member.marital_status,
    dateJoined: member.date_joined,
    profilePhotoUrl: member.profile_photo_url,
    role: member.role,
    isActive: member.is_active,
    createdAt: member.created_at,
    updatedAt: member.updated_at,
    team: member.team
      ? {
          id: member.team.id,
          name: member.team.name,
          color: member.team.color
        }
      : null,
    permissions: buildPermissions(member.role)
  };
}

async function getMemberOrThrow(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { team: true }
  });

  if (!member) {
    throw new ApiError(404, "Member not found.");
  }

  return member;
}

function parseOptionalDate(value?: string | null) {
  return value ? new Date(value) : null;
}

export function registerMemberRoutes(router: Router) {
  router.get(
    "/",
    optionalAuth,
    asyncHandler(async (request, response) => {
      const isAdmin = request.auth ? isAdminRole(request.auth.role) : false;

      if (!isAdmin) {
        const query = publicQuerySchema.parse(request.query);
        const members = await prisma.member.findMany({
          where: {
            is_active: true,
            team_id: query.teamId,
            ...memberSearchWhere(query.search)
          },
          include: { team: true },
          orderBy: [{ first_name: "asc" }, { last_name: "asc" }]
        });

        return response.json({
          members: members.map(serializePublicMember)
        });
      }

      const query = adminQuerySchema.parse(request.query);
      const members = await prisma.member.findMany({
        where: {
          team_id: query.teamId,
          role: query.role,
          ...(query.activeStatus === "active" ? { is_active: true } : {}),
          ...(query.activeStatus === "inactive" ? { is_active: false } : {}),
          ...memberSearchWhere(query.search)
        },
        include: { team: true },
        orderBy: [{ created_at: "desc" }]
      });

      response.json({
        members: members.map(serializePrivateMember)
      });
    })
  );

  router.get(
    "/:id",
    requireAuth,
    asyncHandler(async (request, response) => {
      const memberId = String(request.params.id);
      const member = await getMemberOrThrow(memberId);
      const isSelf = request.auth!.memberId === member.id;
      const isAdmin = isAdminRole(request.auth!.role);

      if (!isSelf && !isAdmin) {
        throw new ApiError(403, "You can only view your own profile.");
      }

      response.json({
        member: serializePrivateMember(member)
      });
    })
  );

  router.post(
    "/",
    requireAuth,
    requireRoles(memberManagers),
    asyncHandler(async (request, response) => {
      const payload = createMemberSchema.parse(request.body);
      const defaultBranch = await ensureDefaultBranch();
      const member = await prisma.member.create({
        data: {
          first_name: payload.firstName,
          last_name: payload.lastName,
          phone_number: normalizePhoneNumber(payload.phoneNumber),
          whatsapp_number: payload.whatsappNumber ?? null,
          email: payload.email ?? null,
          date_of_birth: parseOptionalDate(payload.dateOfBirth),
          marital_status: payload.maritalStatus ?? null,
          date_joined: parseOptionalDate(payload.dateJoined) ?? new Date(),
          profile_photo_url: payload.profilePhotoUrl ?? null,
          role: payload.role,
          team_id: payload.teamId ?? null,
          created_by: request.auth!.memberId,
          branch_id: request.auth!.branchId ?? defaultBranch.id
        },
        include: { team: true }
      });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "CREATE",
        entityType: "Member",
        entityId: member.id,
        after: member,
        ipAddress: request.ip
      });

      if (member.is_active) {
        await smsProvider.send({
          to: member.phone_number,
          message: `Welcome to the youth group, ${member.first_name}! Complete your profile here: ${env.APP_URL}/login?phone=${encodeURIComponent(member.phone_number)}`
        });
      }

      response.status(201).json({
        member: serializePrivateMember(member)
      });
    })
  );

  router.put(
    "/:id",
    requireAuth,
    asyncHandler(async (request, response) => {
      const memberId = String(request.params.id);
      const existing = await getMemberOrThrow(memberId);
      const isSelf = request.auth!.memberId === existing.id;
      const isAdmin = memberManagers.includes(request.auth!.role);

      if (!isSelf && !isAdmin) {
        throw new ApiError(403, "You cannot update this member.");
      }

      const before = serializePrivateMember(existing);
      const data: Prisma.MemberUncheckedUpdateInput = {};

      if (isAdmin) {
        const payload = adminUpdateSchema.parse(request.body);
        data.first_name = payload.firstName;
        data.last_name = payload.lastName;
        data.phone_number = payload.phoneNumber ? normalizePhoneNumber(payload.phoneNumber) : undefined;
        data.whatsapp_number = payload.whatsappNumber !== undefined ? payload.whatsappNumber : undefined;
        data.email = payload.email !== undefined ? payload.email : undefined;
        data.date_of_birth =
          payload.dateOfBirth !== undefined ? parseOptionalDate(payload.dateOfBirth) : undefined;
        data.marital_status =
          payload.maritalStatus !== undefined ? payload.maritalStatus : undefined;
        data.date_joined =
          payload.dateJoined !== undefined ? parseOptionalDate(payload.dateJoined) : undefined;
        data.profile_photo_url =
          payload.profilePhotoUrl !== undefined ? payload.profilePhotoUrl : undefined;
        data.role = payload.role;
        data.team_id = payload.teamId !== undefined ? payload.teamId : undefined;
      } else {
        const payload = selfUpdateSchema.parse(request.body);
        data.whatsapp_number = payload.whatsappNumber !== undefined ? payload.whatsappNumber : undefined;
        data.email = payload.email !== undefined ? payload.email : undefined;
        data.date_of_birth =
          payload.dateOfBirth !== undefined ? parseOptionalDate(payload.dateOfBirth) : undefined;
        data.marital_status =
          payload.maritalStatus !== undefined ? payload.maritalStatus : undefined;
        data.profile_photo_url =
          payload.profilePhotoUrl !== undefined ? payload.profilePhotoUrl : undefined;
      }

      const updated = await prisma.member.update({
        where: { id: existing.id },
        data,
        include: { team: true }
      });

      if (isAdmin) {
        await logAuditEvent({
          actorId: request.auth!.memberId,
          action: "UPDATE",
          entityType: "Member",
          entityId: updated.id,
          before,
          after: serializePrivateMember(updated),
          ipAddress: request.ip
        });
      }

      response.json({
        member: serializePrivateMember(updated)
      });
    })
  );

  router.delete(
    "/:id",
    requireAuth,
    requireRoles(memberManagers),
    asyncHandler(async (request, response) => {
      const memberId = String(request.params.id);
      const existing = await getMemberOrThrow(memberId);
      const updated = await prisma.member.update({
        where: { id: existing.id },
        data: { is_active: false },
        include: { team: true }
      });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "DELETE",
        entityType: "Member",
        entityId: updated.id,
        before: serializePrivateMember(existing),
        after: serializePrivateMember(updated),
        ipAddress: request.ip
      });

      response.status(204).send();
    })
  );

  router.get(
    "/:id/attendance",
    requireAuth,
    asyncHandler(async (request, response) => {
      const memberId = String(request.params.id);
      const isSelf = request.auth!.memberId === memberId;
      if (!isSelf && !isAdminRole(request.auth!.role)) {
        throw new ApiError(403, "You can only view your own attendance.");
      }

      const sessions = await prisma.attendanceSession.findMany({
        where: {
          branch_id: request.auth!.branchId ?? undefined
        },
        include: {
          attendanceRecords: {
            where: { member_id: memberId }
          }
        },
        orderBy: {
          meeting_date: "desc"
        }
      });

      const history = sessions.map((session) => {
        const record = session.attendanceRecords[0];
        return {
          sessionId: session.id,
          date: session.meeting_date,
          status: record ? "present" : "absent",
          method: record?.check_in_method ?? null,
          checkInTime: record?.check_in_time ?? null
        };
      });

      response.json({ history });
    })
  );

  router.get(
    "/:id/dues",
    requireAuth,
    asyncHandler(async (request, response) => {
      const memberId = String(request.params.id);
      const isSelf = request.auth!.memberId === memberId;
      if (!isSelf && !isAdminRole(request.auth!.role)) {
        throw new ApiError(403, "You can only view your own dues.");
      }

      await generateWeeklyDues();
      const rows = await prisma.duesPayment.findMany({
        where: { member_id: memberId },
        orderBy: { week_of: "desc" }
      });

      response.json(buildDuesLedger(rows));
    })
  );

  router.post(
    "/upload-signature",
    requireAuth,
    asyncHandler(async (_request, response) => {
      const publicId = `members/${crypto.randomUUID()}`;
      response.json(await mediaProvider.signImageUpload(publicId));
    })
  );
}
