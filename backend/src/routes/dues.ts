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
      const yearItems = ledgerData.ledger.filter(i => 
        new Date(i.weekOf).getUTCFullYear() === year && 
        (i.status === "paid" || i.status === "advance")
      );
      const yearSummary = ledgerData.annualBreakdown.find(a => a.year === year);

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader("Content-Disposition", `attachment; filename=Victory_Presby_Statement_${year}.pdf`);
      
      doc.pipe(response);

      // --- BRANDING COLORS ---
      const CH_BLUE = "#1a56db";
      const CH_GOLD = "#fbbf24";
      const TEXT_DARK = "#0f172a";
      const TEXT_LIGHT = "#64748b";

      // --- HEADER ---
      // Draw a gold bar at the top
      doc.rect(0, 0, 600, 40).fill(CH_BLUE);
      doc.rect(0, 40, 600, 4).fill(CH_GOLD);

      doc.moveDown(2);
      
      // Church Name & Logo Area
      doc.fillColor(CH_BLUE).fontSize(24).font("Helvetica-Bold").text("Victory Presby Church", { align: "center" });
      doc.fontSize(10).font("Helvetica").fillColor(TEXT_LIGHT).text("Young People's Guild (YPG)", { align: "center" }).moveDown();
      
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#e2e8f0").stroke().moveDown(1.5);

      // Statement Title
      doc.fillColor(TEXT_DARK).fontSize(16).font("Helvetica-Bold").text("DUES STATEMENT", { align: "left" });
      doc.fontSize(9).font("Helvetica").fillColor(TEXT_LIGHT).text(`Period: January ${year} - December ${year}`).moveDown();

      // Member Details Box
      const detailsTop = doc.y;
      doc.rect(50, detailsTop, 500, 80).fill("#f8fafc");
      doc.rect(50, detailsTop, 2, 80).fill(CH_BLUE); // Blue accent line
      
      doc.fillColor(TEXT_DARK).fontSize(10).font("Helvetica-Bold").text("MEMBER DETAILS", 70, detailsTop + 15);
      doc.font("Helvetica").fontSize(11).text(`${member.first_name} ${member.last_name}`, 70, detailsTop + 35);
      doc.fontSize(9).fillColor(TEXT_LIGHT).text(`Team: ${member.team?.name || "N/A"} • ID: ${member.id.split('-')[0].toUpperCase()}`, 70, detailsTop + 50);
      
      // Summary on the right of details
      doc.fillColor(TEXT_DARK).fontSize(10).font("Helvetica-Bold").text("ANNUAL SUMMARY", 350, detailsTop + 15);
      doc.fontSize(14).fillColor(CH_BLUE).text(`GHS ${yearSummary?.totalPaid?.toFixed(2) || "0.00"}`, 350, detailsTop + 35);
      doc.fontSize(8).fillColor(TEXT_LIGHT).font("Helvetica").text("Total Confirmed Payments", 350, detailsTop + 55);

      doc.moveDown(4);

      // --- TABLE ---
      const tableTop = doc.y;
      doc.rect(50, tableTop, 500, 25).fill(CH_BLUE);
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      doc.text("DATE", 65, tableTop + 8);
      doc.text("WEEK", 165, tableTop + 8);
      doc.text("STATUS", 265, tableTop + 8);
      doc.text("METHOD", 365, tableTop + 8);
      doc.text("AMOUNT", 465, tableTop + 8, { align: "right", width: 70 });
      
      let currentY = tableTop + 25;
      
      doc.font("Helvetica").fontSize(9).fillColor(TEXT_DARK);
      
      if (yearItems.length === 0) {
        doc.text("No confirmed payments found for this period.", 50, currentY + 20, { align: "center", width: 500 });
      } else {
        yearItems.forEach((item, i) => {
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }
          
          // Zebra striping
          if (i % 2 === 0) {
            doc.rect(50, currentY, 500, 20).fill("#f1f5f9");
          }
          
          doc.fillColor(TEXT_DARK);
          doc.text(new Date(item.weekOf).toLocaleDateString('en-GB'), 65, currentY + 6);
          doc.text(`Week ${item.weekNumber}`, 165, currentY + 6);
          doc.fillColor(CH_BLUE).font("Helvetica-Bold").text("PAID", 265, currentY + 6);
          doc.fillColor(TEXT_DARK).font("Helvetica").text(item.method?.toUpperCase() || "CASH", 365, currentY + 6);
          doc.font("Helvetica-Bold").text(`GHS ${item.amount.toFixed(2)}`, 465, currentY + 6, { align: "right", width: 70 });
          
          currentY += 20;
        });
      }

      // --- FOOTER ---
      const footerY = 780;
      doc.moveTo(50, footerY - 10).lineTo(550, footerY - 10).strokeColor("#e2e8f0").stroke();
      doc.fontSize(8).fillColor(TEXT_LIGHT).text("Victory Presbyterian Church - YPG Fellowship Management System", 50, footerY, { align: "center", width: 500 });
      doc.text(`This is a computer generated statement. Date: ${new Date().toLocaleString()}`, 50, footerY + 12, { align: "center", width: 500 });

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
