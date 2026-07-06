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
import { buildDuesLedger } from "../services/dues-service.js";
import { buildPermissions, isAdminRole, memberManagers } from "../utils/permissions.js";
import { normalizePhoneNumber } from "../utils/phone.js";
import { getNextMonday } from "../utils/dates.js";

const publicQuerySchema = z.object({
  search: z.string().optional(),
  teamId: z.string().uuid().optional()
});

const adminQuerySchema = z.object({
  search: z.string().optional(),
  teamId: z.string().uuid().optional(),
  role: z.enum(["president", "vice_president", "secretary", "financial_secretary", "team_lead", "member"]).optional(),
  activeStatus: z.enum(["active", "inactive", "all"]).optional()
});

const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(8),
  whatsappNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional().nullable(),
  dateJoined: z.string().optional().nullable(),
  profilePhotoUrl: z.string().url().optional().nullable(),
  role: z.enum(["president", "vice_president", "secretary", "financial_secretary", "team_lead", "member"]),
  teamId: z.string().uuid().optional().nullable()
});

const adminUpdateSchema = createMemberSchema.partial();
const selfUpdateSchema = z.object({
  whatsappNumber: z.string().optional().nullable(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional().nullable()
});

function calculateProfileCompletion(member: any) {
  let percentage = 0;
  const missing_fields: string[] = [];

  if (member.profile_photo_url) percentage += 25;
  else missing_fields.push("profile_photo");

  if (member.email) percentage += 25;
  else missing_fields.push("email");

  if (member.whatsapp_number) percentage += 25;
  else missing_fields.push("whatsapp_number");

  if (member.marital_status) percentage += 25;
  else missing_fields.push("marital_status");

  return { percentage, missing_fields };
}

function memberSearchWhere(search?: string): Prisma.MemberWhereInput | undefined {
  if (!search) return undefined;
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
    team: member.team ? { id: member.team.id, name: member.team.name, color: member.team.color } : null
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
    location: member.location,
    notes: member.notes,
    dateOfBirth: member.date_of_birth,
    maritalStatus: member.marital_status,
    dateJoined: member.date_joined,
    profilePhotoUrl: member.profile_photo_url,
    role: member.role,
    isActive: member.is_active,
    createdAt: member.created_at,
    updatedAt: member.updated_at,
    team: member.team ? { id: member.team.id, name: member.team.name, color: member.team.color } : null,
    permissions: buildPermissions(member.role),
    profile_completion: calculateProfileCompletion(member)
  };
}

async function getMemberOrThrow(memberId: string) {
  const member = await prisma.member.findUnique({ where: { id: memberId }, include: { team: true } });
  if (!member) throw new ApiError(404, "Member not found.");
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
      const queryParams = request.query;
      const isPublicDirectory = !isAdmin || (!queryParams.role && !queryParams.activeStatus);

      if (isPublicDirectory) {
        const query = publicQuerySchema.parse(queryParams);
        const members = await prisma.member.findMany({
          where: { is_active: true, team_id: query.teamId, ...memberSearchWhere(query.search) },
          include: { team: true },
          orderBy: [{ first_name: "asc" }, { last_name: "asc" }]
        });
        return response.json({ members: members.map(serializePublicMember) });
      }

      const query = adminQuerySchema.parse(queryParams);
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
      response.json({ members: members.map(serializePrivateMember) });
    })
  );

  router.get(
    "/birthdays/this-week",
    requireAuth,
    asyncHandler(async (request, response) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const days = parseInt(request.query.days as string) || 7;
      const nextWindow = new Date(now);
      nextWindow.setDate(now.getDate() + days);

      const members = await prisma.member.findMany({
        where: {
          is_active: true,
          date_of_birth: { not: null }
        },
        include: { team: true }
      });

      const birthdays = members.filter(member => {
        if (!member.date_of_birth) return false;
        const dob = new Date(member.date_of_birth);
        
        const bdayCurrent = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        const bdayNext = new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
        
        return (bdayCurrent >= now && bdayCurrent <= nextWindow) || 
               (bdayNext >= now && bdayNext <= nextWindow);
      }).sort((a, b) => {
        const da = new Date(a.date_of_birth!);
        const db = new Date(b.date_of_birth!);
        const ba = new Date(now.getFullYear(), da.getMonth(), da.getDate());
        const bb = new Date(now.getFullYear(), db.getMonth(), db.getDate());
        if (ba < now) ba.setFullYear(now.getFullYear() + 1);
        if (bb < now) bb.setFullYear(now.getFullYear() + 1);
        return ba.getTime() - bb.getTime();
      });

      response.json({ members: birthdays.map(serializePrivateMember) });
    })
  );

  router.post(
    "/",
    requireAuth,
    requireRoles(memberManagers),
    asyncHandler(async (request, response) => {
      const payload = createMemberSchema.parse(request.body);
      const member = await prisma.member.create({
        data: {
          first_name: payload.firstName,
          last_name: payload.lastName,
          phone_number: normalizePhoneNumber(payload.phoneNumber),
          whatsapp_number: payload.whatsappNumber,
          email: payload.email,
          location: payload.location,
          notes: payload.notes,
          date_of_birth: parseOptionalDate(payload.dateOfBirth),
          marital_status: payload.maritalStatus,
          date_joined: payload.dateJoined ? new Date(payload.dateJoined) : getNextMonday(new Date()),
          profile_photo_url: payload.profilePhotoUrl,
          role: payload.role,
          team_id: payload.teamId,
          branch_id: request.auth!.branchId
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

      response.status(201).json({ member: serializePrivateMember(member) });
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

      if (!isSelf && !isAdmin) throw new ApiError(403, "You cannot update this member.");

      const before = serializePrivateMember(existing);
      const data: Prisma.MemberUncheckedUpdateInput = {};

      if (isAdmin) {
        const payload = adminUpdateSchema.parse(request.body);
        if (payload.firstName) data.first_name = payload.firstName;
        if (payload.lastName) data.last_name = payload.lastName;
        if (payload.phoneNumber) data.phone_number = normalizePhoneNumber(payload.phoneNumber);
        if (payload.whatsappNumber !== undefined) data.whatsapp_number = payload.whatsappNumber;
        if (payload.email !== undefined) data.email = payload.email;
        if (payload.location !== undefined) data.location = payload.location;
        if (payload.notes !== undefined) data.notes = payload.notes;
        if (payload.dateOfBirth !== undefined) data.date_of_birth = parseOptionalDate(payload.dateOfBirth);
        if (payload.maritalStatus !== undefined) data.marital_status = payload.maritalStatus;
        if (payload.dateJoined !== undefined) data.date_joined = parseOptionalDate(payload.dateJoined);
        if (payload.profilePhotoUrl !== undefined) data.profile_photo_url = payload.profilePhotoUrl;
        if (payload.role) data.role = payload.role;
        if (payload.teamId !== undefined) data.team_id = payload.teamId;
      } else {
        const payload = selfUpdateSchema.parse(request.body);
        if (payload.whatsappNumber !== undefined) data.whatsapp_number = payload.whatsappNumber;
        if (payload.email !== undefined) data.email = payload.email;
        if (payload.maritalStatus !== undefined) data.marital_status = payload.maritalStatus;
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

      response.json({ member: serializePrivateMember(updated) });
    })
  );

  router.put(
    "/:id/photo",
    requireAuth,
    asyncHandler(async (request, response) => {
      const memberId = String(request.params.id);
      const existing = await getMemberOrThrow(memberId);
      const isSelf = request.auth!.memberId === existing.id;
      const isAdmin = isAdminRole(request.auth!.role);

      if (!isSelf && !isAdmin) throw new ApiError(403, "You cannot update this photo.");

      const { profile_photo_url } = z.object({ profile_photo_url: z.string().url() }).parse(request.body);

      const updated = await prisma.member.update({
        where: { id: existing.id },
        data: { profile_photo_url },
        include: { team: true }
      });

      response.json({ member: serializePrivateMember(updated) });
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
      if (!isSelf && !isAdminRole(request.auth!.role)) throw new ApiError(403, "You can only view your own attendance.");

      const member = await getMemberOrThrow(memberId);
      const joinedDate = member.date_joined ? new Date(member.date_joined) : null;
      if (joinedDate) joinedDate.setHours(0, 0, 0, 0);

      const now = new Date();
      now.setHours(23, 59, 59, 999); // Include sessions up to end of today

      const sessions = await prisma.attendanceSession.findMany({
        where: { 
          branch_id: request.auth!.branchId ?? undefined,
          meeting_date: {
            gte: joinedDate || undefined,
            lte: now
          }
        },
        include: { attendanceRecords: { where: { member_id: memberId } } },
        orderBy: { meeting_date: "desc" }
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
      if (!isSelf && !isAdminRole(request.auth!.role)) throw new ApiError(403, "You can only view your own dues.");

      const rows = await prisma.duesPayment.findMany({
        where: { member_id: memberId },
        orderBy: { week_of: "desc" }
      });
      const member = await prisma.member.findUnique({ where: { id: memberId }, select: { date_joined: true } });
      response.json(buildDuesLedger(rows, member?.date_joined || undefined));
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
