import type { Router } from "express";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { asyncHandler, ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit-service.js";
import { generateWeeklyDues } from "../services/dues-scheduler.js";
import { buildDuesLedger, WEEKLY_DUES_AMOUNT } from "../services/dues-service.js";
import { financeManagers, isAdminRole } from "../utils/permissions.js";
import { normalizePhoneNumber } from "../utils/phone.js";

function countMondaysInYear(year: number) {
  const firstMonday = new Date(Date.UTC(year, 0, 1));
  while (firstMonday.getUTCDay() !== 1) {
    firstMonday.setUTCDate(firstMonday.getUTCDate() + 1);
  }

  let count = 0;
  for (let cursor = new Date(firstMonday); cursor.getUTCFullYear() === year; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    count += 1;
  }

  return count;
}

const cashPaymentSchema = z.object({
  memberId: z.string().uuid().optional(),
  phoneNumber: z.string().optional(),
  weeks: z.array(z.string()).min(1).optional(),
  amount: z.number().positive().optional()
}).refine((value) => Boolean(value.weeks?.length) || typeof value.amount === "number", {
  message: "Provide dues weeks or a cash amount."
});

export function registerDuesRoutes(router: Router) {
  router.get(
    "/",
    requireAuth,
    asyncHandler(async (request, response) => {
      await generateWeeklyDues();
      const isAdmin = isAdminRole(request.auth!.role);
      const memberId = isAdmin ? (request.query.memberId as string | undefined) : request.auth!.memberId;

      const rows = await prisma.duesPayment.findMany({
        where: {
          member_id: memberId ?? undefined,
          payment_status:
            typeof request.query.status === "string"
              ? (request.query.status as "pending" | "confirmed" | "failed")
              : undefined
        },
        orderBy: [{ week_of: "desc" }]
      });

      response.json(buildDuesLedger(rows));
    })
  );

  router.post(
    "/cash",
    requireAuth,
    requireRoles(financeManagers),
    asyncHandler(async (request, response) => {
      const payload = cashPaymentSchema.parse(request.body);
      await generateWeeklyDues();
      const member =
        payload.memberId
          ? await prisma.member.findUnique({ where: { id: payload.memberId } })
          : payload.phoneNumber
            ? await prisma.member.findUnique({
                where: { phone_number: normalizePhoneNumber(payload.phoneNumber) }
              })
            : null;

      if (!member) {
        throw new ApiError(404, "Member not found.");
      }

      const existingRows = await prisma.duesPayment.findMany({
        where: { member_id: member.id },
        orderBy: { week_of: "asc" }
      });
      const unpaidRows = existingRows.filter((row) => row.payment_status !== "confirmed");

      let targetWeeks = payload.weeks ?? [];

      if (typeof payload.amount === "number") {
        const normalizedAmount = Number(payload.amount.toFixed(2));
        const exactWeeks = normalizedAmount / WEEKLY_DUES_AMOUNT;

        if (!Number.isInteger(exactWeeks)) {
          throw new ApiError(400, `Cash payments must be entered in GHS ${WEEKLY_DUES_AMOUNT.toFixed(2)} increments.`);
        }

        if (exactWeeks < 1) {
          throw new ApiError(400, `A minimum of GHS ${WEEKLY_DUES_AMOUNT.toFixed(2)} is required to cover one week.`);
        }

        if (exactWeeks > unpaidRows.length) {
          throw new ApiError(400, "That amount is more than this member's current outstanding dues.");
        }

        targetWeeks = unpaidRows.slice(0, exactWeeks).map((row) => row.week_of.toISOString());
      }

      if (!targetWeeks.length) {
        throw new ApiError(400, "No outstanding dues weeks were selected.");
      }

      const now = new Date();
      const updatedRows = [];

      for (const week of targetWeeks) {
        const weekDate = new Date(week);
        const existing = await prisma.duesPayment.findUnique({
          where: {
            member_id_week_of: {
              member_id: member.id,
              week_of: weekDate
            }
          }
        });

        const row = existing
          ? await prisma.duesPayment.update({
              where: { id: existing.id },
              data: {
                amount: new Prisma.Decimal("2.00"),
                payment_method: "cash",
                payment_status: "confirmed",
                recorded_by: request.auth!.memberId,
                payment_date: now
              }
            })
          : await prisma.duesPayment.create({
              data: {
                member_id: member.id,
                amount: new Prisma.Decimal("2.00"),
                week_of: weekDate,
                payment_method: "cash",
                payment_status: "confirmed",
                recorded_by: request.auth!.memberId,
                payment_date: now
              }
            });

        updatedRows.push(row);
        await logAuditEvent({
          actorId: request.auth!.memberId,
          action: "RECORD_PAYMENT",
          entityType: "DuesPayment",
          entityId: row.id,
          before: existing,
          after: row,
          ipAddress: request.ip
        });
      }

      response.status(201).json({
        amountApplied: updatedRows.reduce((sum, row) => sum + Number(row.amount), 0),
        weeksCovered: updatedRows.length,
        payments: updatedRows.map((row) => ({
          id: row.id,
          weekOf: row.week_of,
          amount: Number(row.amount),
          status: row.payment_status
        }))
      });
    })
  );

  router.post(
    "/momo/initiate",
    requireAuth,
    asyncHandler(async (_request, _response) => {
      throw new ApiError(501, "MoMo payment initiation is deferred for this MVP release.");
    })
  );

  router.post(
    "/webhook",
    asyncHandler(async (_request, _response) => {
      throw new ApiError(501, "Paystack webhook handling is deferred for this MVP release.");
    })
  );

  router.get(
    "/reports",
    requireAuth,
    requireRoles(financeManagers),
    asyncHandler(async (_request, response) => {
      await generateWeeklyDues();
      const allRows = await prisma.duesPayment.findMany({
        include: {
          member: true
        },
        orderBy: { week_of: "desc" }
      });

      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setUTCDate(now.getUTCDate() - now.getUTCDay() + 1);
      currentWeekStart.setUTCHours(0, 0, 0, 0);

      const totalCollectedThisWeek = allRows
        .filter((row) => row.payment_status === "confirmed" && row.payment_date && row.payment_date >= currentWeekStart)
        .reduce((sum, row) => sum + Number(row.amount), 0);

      const totalCollectedThisMonth = allRows
        .filter(
          (row) =>
            row.payment_status === "confirmed" &&
            row.payment_date &&
            row.payment_date.getUTCFullYear() === now.getUTCFullYear() &&
            row.payment_date.getUTCMonth() === now.getUTCMonth()
        )
        .reduce((sum, row) => sum + Number(row.amount), 0);

      const activeMembersCount = new Set(allRows.map((row) => row.member.id)).size;
      const currentYear = now.getUTCFullYear();
      const currentYearRows = allRows.filter((row) => row.week_of.getUTCFullYear() === currentYear);
      const totalReceivedSoFar = currentYearRows
        .filter((row) => row.payment_status === "confirmed")
        .reduce((sum, row) => sum + Number(row.amount), 0);
      const projectedYearAmount = activeMembersCount * countMondaysInYear(currentYear) * WEEKLY_DUES_AMOUNT;

      const topPayers = Object.values(
        currentYearRows.reduce<
          Record<
            string,
            {
              memberId: string;
              firstName: string;
              lastName: string;
              amountPaid: number;
              weeksPaid: number;
            }
          >
        >((accumulator, row) => {
          if (!accumulator[row.member.id]) {
            accumulator[row.member.id] = {
              memberId: row.member.id,
              firstName: row.member.first_name,
              lastName: row.member.last_name,
              amountPaid: 0,
              weeksPaid: 0
            };
          }

          if (row.payment_status === "confirmed") {
            accumulator[row.member.id].amountPaid += Number(row.amount);
            accumulator[row.member.id].weeksPaid += 1;
          }

          return accumulator;
        }, {})
      )
        .sort((left, right) => right.amountPaid - left.amountPaid || right.weeksPaid - left.weeksPaid)
        .slice(0, 3);

      const arrears = Object.values(
        allRows.reduce<Record<string, { memberId: string; firstName: string; lastName: string; outstandingWeeks: number }>>(
          (accumulator, row) => {
            if (!accumulator[row.member.id]) {
              accumulator[row.member.id] = {
                memberId: row.member.id,
                firstName: row.member.first_name,
                lastName: row.member.last_name,
                outstandingWeeks: 0
              };
            }
            if (row.payment_status !== "confirmed") {
              accumulator[row.member.id].outstandingWeeks += 1;
            }
            return accumulator;
          },
          {}
        )
      );

      response.json({
        summary: {
          totalCollectedThisWeek,
          totalCollectedThisMonth,
          totalReceivedSoFar,
          projectedYearAmount,
          activeMembersCount,
          currentYear
        },
        alerts: {
          twoPlusOutstanding: arrears.filter((row) => row.outstandingWeeks >= 2),
          twoMonthsOutstanding: arrears.filter((row) => row.outstandingWeeks >= 8)
        },
        topPayers,
        paymentLog: allRows.map((row) => ({
          id: row.id,
          memberId: row.member.id,
          memberName: `${row.member.first_name} ${row.member.last_name}`,
          weekOf: row.week_of,
          amount: Number(row.amount),
          status: row.payment_status,
          method: row.payment_method,
          paymentDate: row.payment_date
        }))
      });
    })
  );
}
