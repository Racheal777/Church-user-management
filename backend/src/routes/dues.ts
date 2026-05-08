import type { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { asyncHandler, ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit-service.js";
import { generateWeeklyDues } from "../services/dues-scheduler.js";
import { buildDuesLedger, WEEKLY_DUES_AMOUNT } from "../services/dues-service.js";
import { financeManagers, isAdminRole } from "../utils/permissions.js";
import { normalizePhoneNumber } from "../utils/phone.js";

const cashPaymentSchema = z.object({
  memberId: z.string().uuid().optional(),
  phoneNumber: z.string().optional(),
  weeks: z.array(z.string()).min(1).optional(),
  amount: z.number().positive().optional()
}).refine((value) => Boolean(value.weeks?.length) || typeof value.amount === "number", {
  message: "Provide dues weeks or a cash amount."
});

const initiateMomoSchema = z.object({
  member_id: z.string().uuid(),
  week_dates: z.array(z.string()).min(1),
  total_amount: z.number().positive()
});

export function registerDuesRoutes(router: Router) {
  // GET /api/dues - Fetch ledger with detailed statuses
  router.get(
    "/",
    requireAuth,
    asyncHandler(async (request, response) => {
      const isAdmin = isAdminRole(request.auth!.role);
      const memberId = isAdmin ? (request.query.memberId as string | undefined) : request.auth!.memberId;

      if (!memberId) {
        throw new ApiError(400, "Member ID is required.");
      }

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { date_joined: true }
      });

      const rows = await prisma.duesPayment.findMany({
        where: {
          member_id: memberId,
          payment_status:
            typeof request.query.status === "string"
              ? (request.query.status as "pending" | "confirmed" | "failed")
              : undefined
        },
        orderBy: [{ week_of: "desc" }]
      });

      response.json(buildDuesLedger(rows, member?.date_joined || undefined));
    })
  );

  // POST /api/dues/momo/initiate
  router.post(
    "/momo/initiate",
    requireAuth,
    asyncHandler(async (request, response) => {
      const { member_id, week_dates, total_amount } = initiateMomoSchema.parse(request.body);
      
      const member = await prisma.member.findUnique({
        where: { id: member_id },
        select: { date_joined: true }
      });

      // Validation: Weeks must be consecutive and starting from oldest unpaid
      const existingRows = await prisma.duesPayment.findMany({
        where: { 
          member_id, 
          payment_status: { not: "confirmed" },
          week_of: { gte: member?.date_joined || new Date(0) }
        },
        orderBy: { week_of: "asc" }
      });

      const oldestUnpaid = existingRows[0];
      if (oldestUnpaid) {
        const oldestDate = oldestUnpaid.week_of.toISOString().split('T')[0];
        const targetDate = new Date(week_dates[0]).toISOString().split('T')[0];
        
        if (oldestDate !== targetDate) {
          throw new ApiError(400, `Please clear your oldest unpaid week (${oldestDate}) first.`);
        }
      }

      // In a real app, integrate with Paystack here
      // For this MVP, we return a mock authorization URL
      const reference = `PY-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      response.json({
        authorization_url: `https://checkout.paystack.com/mock?ref=${reference}&amount=${total_amount * 100}`,
        reference
      });
    })
  );

  // POST /api/dues/cash
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

        // Allow overpayment - carry forward will be handled by buildDuesLedger view
        // But for recording cash, we just record the confirmed weeks.
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
      }

      response.status(201).json({
        amountApplied: updatedRows.reduce((sum, row) => sum + Number(row.amount), 0),
        weeksCovered: updatedRows.length
      });
    })
  );

  // GET /api/dues/statement
  router.get(
    "/statement",
    requireAuth,
    asyncHandler(async (request, response) => {
      const year = parseInt(request.query.year as string) || new Date().getFullYear();
      const memberId = request.query.member_id as string || request.auth!.memberId;

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: { team: true }
      });

      if (!member) throw new ApiError(404, "Member not found.");

      const rows = await prisma.duesPayment.findMany({
        where: { member_id: memberId },
        orderBy: { week_of: "asc" }
      });

      const ledgerData = buildDuesLedger(rows, member.date_joined || undefined);
      const yearItems = ledgerData.ledger.filter(i => new Date(i.weekOf).getUTCFullYear() === year);
      const yearSummary = ledgerData.annualBreakdown.find(a => a.year === year);

      const doc = new PDFDocument({ margin: 50 });
      
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader("Content-Disposition", `attachment; filename=Stewardship_Statement_${year}.pdf`);
      
      doc.pipe(response);

      // Header
      doc.fontSize(20).text("YPG Fellowship", { align: "center" });
      doc.fontSize(12).text("Stewardship Statement", { align: "center" }).moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

      // Member Info
      doc.fontSize(10).font("Helvetica-Bold").text(`Member: ${member.first_name} ${member.last_name}`);
      doc.font("Helvetica").text(`Team: ${member.team?.name || "N/A"}`);
      doc.text(`Year: ${year}`);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`).moveDown(2);

      // Table Header
      const tableTop = doc.y;
      doc.font("Helvetica-Bold");
      doc.text("Date", 50, tableTop);
      doc.text("Week", 150, tableTop);
      doc.text("Status", 250, tableTop);
      doc.text("Amount", 350, tableTop);
      doc.text("Method", 450, tableTop);
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);

      // Table Rows
      doc.font("Helvetica");
      yearItems.forEach((item, i) => {
        const y = doc.y;
        if (y > 700) doc.addPage();
        
        doc.text(new Date(item.weekOf).toLocaleDateString(), 50, y);
        doc.text(`Week ${item.weekNumber}`, 150, y);
        doc.text(item.status.toUpperCase(), 250, y);
        doc.text(`GHS ${item.amount.toFixed(2)}`, 350, y);
        doc.text(item.method || "-", 450, y);
        doc.moveDown(1.2);
      });

      // Summary
      doc.moveDown(2);
      doc.font("Helvetica-Bold").text("Summary", { underline: true }).moveDown();
      doc.font("Helvetica").text(`Total Commitment: GHS ${yearSummary?.totalPaid! + yearSummary?.totalOutstanding!}`);
      doc.text(`Total Paid: GHS ${yearSummary?.totalPaid}`);
      doc.text(`Total Outstanding: GHS ${yearSummary?.totalOutstanding}`);
      
      doc.moveDown(4);
      doc.fontSize(8).fillColor("grey").text("YPG - Stewardship is Worship", { align: "center" });

      doc.end();
    })
  );

  // Reports
  router.get(
    "/reports",
    requireAuth,
    requireRoles(financeManagers),
    asyncHandler(async (_request, response) => {
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
      
      const countMondaysInYear = (year: number) => {
        let count = 0;
        let d = new Date(Date.UTC(year, 0, 1));
        while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
        while (d.getUTCFullYear() === year) {
          count++;
          d.setUTCDate(d.getUTCDate() + 7);
        }
        return count;
      };

      const projectedYearAmount = activeMembersCount * countMondaysInYear(currentYear) * WEEKLY_DUES_AMOUNT;

      response.json({
        summary: {
          totalCollectedThisWeek,
          totalCollectedThisMonth,
          totalReceivedSoFar,
          projectedYearAmount,
          activeMembersCount,
          currentYear
        }
      });
    })
  );
}
