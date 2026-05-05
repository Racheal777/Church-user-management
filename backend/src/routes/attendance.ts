import crypto from "node:crypto";

import type { Router } from "express";

import { totp } from "otplib";
import { z } from "zod";

import { env } from "../config/env.js";
import { asyncHandler, ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit-service.js";
import { ensureDefaultBranch } from "../services/branch-service.js";
import { addMinutes, getWeekMonday } from "../utils/dates.js";
import { attendanceManagers } from "../utils/permissions.js";
import { normalizePhoneNumber } from "../utils/phone.js";

totp.options = {
  digits: 4,
  step: env.TOTP_STEP_SECONDS,
  window: 0
};

const startSessionSchema = z.object({
  meetingDate: z.string().optional()
});

const checkInSchema = z.object({
  code: z.string().length(4)
});

const manualCheckInSchema = z.object({
  phoneNumber: z.string().min(8)
});

async function findActiveSession(branchId: string | null) {
  const session = await prisma.attendanceSession.findFirst({
    where: {
      branch_id: branchId ?? undefined,
      is_open: true
    },
    include: {
      attendanceRecords: true
    },
    orderBy: {
      created_at: "desc"
    }
  });

  if (!session) {
    return null;
  }

  if (session.window_close_at && session.window_close_at <= new Date()) {
    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { is_open: false }
    });
    return null;
  }

  return session;
}

function currentCode(secret: string) {
  return totp.generate(secret);
}

function secondsRemaining() {
  const epochSeconds = Math.floor(Date.now() / 1000);
  const elapsed = epochSeconds % env.TOTP_STEP_SECONDS;
  return env.TOTP_STEP_SECONDS - elapsed;
}

export function registerAttendanceRoutes(router: Router) {
  router.post(
    "/sessions",
    requireAuth,
    requireRoles(attendanceManagers),
    asyncHandler(async (request, response) => {
      const payload = startSessionSchema.parse(request.body);
      const branch = await ensureDefaultBranch();
      const activeSession = await findActiveSession(request.auth!.branchId ?? branch.id);

      if (activeSession) {
        throw new ApiError(409, "An attendance session is already open.");
      }

      const sourceDate = payload.meetingDate ? new Date(payload.meetingDate) : new Date();
      const session = await prisma.attendanceSession.create({
        data: {
          meeting_date: getWeekMonday(sourceDate),
          totp_secret: crypto.randomBytes(20).toString("hex"),
          window_open_at: new Date(),
          window_close_at: addMinutes(new Date(), env.ATTENDANCE_WINDOW_MINUTES),
          is_open: true,
          created_by: request.auth!.memberId,
          branch_id: request.auth!.branchId ?? branch.id
        }
      });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "CREATE",
        entityType: "AttendanceSession",
        entityId: session.id,
        after: session,
        ipAddress: request.ip
      });

      response.status(201).json({
        session,
        code: currentCode(session.totp_secret),
        secondsRemaining: secondsRemaining()
      });
    })
  );

  router.get(
    "/sessions/active",
    requireAuth,
    requireRoles(attendanceManagers),
    asyncHandler(async (request, response) => {
      const session = await findActiveSession(request.auth!.branchId);
      if (!session) {
        throw new ApiError(404, "No active attendance session.");
      }

      response.json({
        session: {
          id: session.id,
          meetingDate: session.meeting_date,
          windowOpenAt: session.window_open_at,
          windowCloseAt: session.window_close_at,
          attendeeCount: session.attendanceRecords.length
        },
        code: currentCode(session.totp_secret),
        secondsRemaining: secondsRemaining()
      });
    })
  );

  router.put(
    "/sessions/:id/close",
    requireAuth,
    requireRoles(attendanceManagers),
    asyncHandler(async (request, response) => {
      const sessionId = String(request.params.id);
      const before = await prisma.attendanceSession.findUniqueOrThrow({
        where: { id: sessionId }
      });
      const session = await prisma.attendanceSession.update({
        where: { id: sessionId },
        data: {
          is_open: false,
          window_close_at: new Date()
        }
      });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "UPDATE",
        entityType: "AttendanceSession",
        entityId: session.id,
        before,
        after: session,
        ipAddress: request.ip
      });

      response.json({ session });
    })
  );

  router.post(
    "/checkin",
    requireAuth,
    asyncHandler(async (request, response) => {
      const payload = checkInSchema.parse(request.body);
      const session = await findActiveSession(request.auth!.branchId);
      if (!session) {
        throw new ApiError(400, "Attendance is closed for today.");
      }

      const existing = await prisma.attendanceRecord.findUnique({
        where: {
          session_id_member_id: {
            session_id: session.id,
            member_id: request.auth!.memberId
          }
        }
      });

      if (existing) {
        return response.json({
          status: "already_checked_in",
          message: "You're already checked in today.",
          record: existing
        });
      }

      if (!totp.check(payload.code, session.totp_secret)) {
        throw new ApiError(400, "Incorrect code. Look at the screen for the current one.");
      }

      const record = await prisma.attendanceRecord.create({
        data: {
          session_id: session.id,
          member_id: request.auth!.memberId,
          check_in_time: new Date(),
          check_in_method: "self"
        }
      });

      response.status(201).json({
        status: "checked_in",
        message: "Welcome! You're checked in.",
        record
      });
    })
  );

  router.post(
    "/manual",
    requireAuth,
    requireRoles(attendanceManagers),
    asyncHandler(async (request, response) => {
      const payload = manualCheckInSchema.parse(request.body);
      const session = await findActiveSession(request.auth!.branchId);
      if (!session) {
        throw new ApiError(400, "Attendance is closed for today.");
      }

      const member = await prisma.member.findUnique({
        where: { phone_number: normalizePhoneNumber(payload.phoneNumber) }
      });

      if (!member || !member.is_active) {
        throw new ApiError(404, "Member not found.");
      }

      const existing = await prisma.attendanceRecord.findUnique({
        where: {
          session_id_member_id: {
            session_id: session.id,
            member_id: member.id
          }
        }
      });

      if (existing) {
        throw new ApiError(409, "This member is already checked in.");
      }

      const record = await prisma.attendanceRecord.create({
        data: {
          session_id: session.id,
          member_id: member.id,
          check_in_time: new Date(),
          check_in_method: "manual",
          marked_by: request.auth!.memberId
        }
      });

      await logAuditEvent({
        actorId: request.auth!.memberId,
        action: "MARK_PRESENT",
        entityType: "AttendanceRecord",
        entityId: record.id,
        after: record,
        ipAddress: request.ip
      });

      response.status(201).json({ record, memberId: member.id });
    })
  );

  router.get(
    "/sessions/:id",
    requireAuth,
    requireRoles(attendanceManagers),
    asyncHandler(async (request, response) => {
      const sessionId = String(request.params.id);
      const session = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          attendanceRecords: {
            include: {
              member: {
                include: { team: true }
              }
            },
            orderBy: { check_in_time: "asc" }
          }
        }
      });

      if (!session) {
        throw new ApiError(404, "Attendance session not found.");
      }

      response.json({
        session: {
          id: session.id,
          meetingDate: session.meeting_date,
          isOpen: session.is_open,
          attendees: session.attendanceRecords.map((record) => ({
            id: record.id,
            checkInTime: record.check_in_time,
            method: record.check_in_method,
            member: {
              id: record.member.id,
              firstName: record.member.first_name,
              lastName: record.member.last_name,
              phoneNumber: record.member.phone_number,
              profilePhotoUrl: record.member.profile_photo_url,
              team: record.member.team
            }
          }))
        }
      });
    })
  );

  router.get(
    "/reports",
    requireAuth,
    requireRoles(attendanceManagers),
    asyncHandler(async (request, response) => {
      const rangeStartQuery =
        typeof request.query.rangeStart === "string" ? request.query.rangeStart : undefined;
      const rangeEndQuery =
        typeof request.query.rangeEnd === "string" ? request.query.rangeEnd : undefined;
      const rangeStart = rangeStartQuery ? new Date(rangeStartQuery) : undefined;
      const rangeEnd = rangeEndQuery ? new Date(rangeEndQuery) : undefined;

      const sessions = await prisma.attendanceSession.findMany({
        where: {
          branch_id: request.auth!.branchId ?? undefined,
          ...(rangeStart || rangeEnd
            ? {
                meeting_date: {
                  ...(rangeStart ? { gte: rangeStart } : {}),
                  ...(rangeEnd ? { lte: rangeEnd } : {})
                }
              }
            : {})
        },
        include: {
          attendanceRecords: {
            include: {
              member: {
                include: { team: true }
              }
            }
          }
        },
        orderBy: { meeting_date: "desc" }
      });

      const activeMembers = await prisma.member.findMany({
        where: { is_active: true, branch_id: request.auth!.branchId ?? undefined },
        include: { team: true }
      });

      const weeklySessions = sessions.filter((session) => session.meeting_date >= getWeekMonday(new Date()));
      const weeklyAttendanceCount = weeklySessions.reduce(
        (sum, session) => sum + session.attendanceRecords.length,
        0
      );
      const weeklyRate =
        activeMembers.length && weeklySessions.length
          ? weeklyAttendanceCount / (activeMembers.length * weeklySessions.length)
          : 0;
      const monthlySessions = sessions.filter((session) => {
        const now = new Date();
        return (
          session.meeting_date.getUTCFullYear() === now.getUTCFullYear() &&
          session.meeting_date.getUTCMonth() === now.getUTCMonth()
        );
      });
      const monthlyAttendanceCount = monthlySessions.reduce(
        (sum, session) => sum + session.attendanceRecords.length,
        0
      );
      const monthlyRate =
        activeMembers.length && monthlySessions.length
          ? monthlyAttendanceCount / (activeMembers.length * monthlySessions.length)
          : 0;

      const absentThreePlus = activeMembers
        .map((member) => {
          let misses = 0;
          for (const session of sessions) {
            const present = session.attendanceRecords.some((record) => record.member_id === member.id);
            if (present) {
              break;
            }
            misses += 1;
          }
          return { member, misses };
        })
        .filter((item) => item.misses >= 3)
        .map((item) => ({
          memberId: item.member.id,
          firstName: item.member.first_name,
          lastName: item.member.last_name,
          misses: item.misses
        }));

      const leaderboard = Object.values(
        activeMembers.reduce<Record<string, { teamId: string; teamName: string; color: string; score: number }>>(
          (accumulator, member) => {
            if (!member.team) {
              return accumulator;
            }
            if (!accumulator[member.team.id]) {
              accumulator[member.team.id] = {
                teamId: member.team.id,
                teamName: member.team.name,
                color: member.team.color,
                score: 0
              };
            }
            accumulator[member.team.id].score += sessions.reduce(
              (sum, session) =>
                sum + Number(session.attendanceRecords.some((record) => record.member_id === member.id)),
              0
            );
            return accumulator;
          },
          {}
        )
      ).sort((left, right) => right.score - left.score);

      response.json({
        summary: {
          weeklyAttendanceRate: weeklyRate,
          monthlyAttendanceRate: monthlyRate,
          totalSessions: sessions.length
        },
        absentThreePlus,
        leaderboard
      });
    })
  );
}
