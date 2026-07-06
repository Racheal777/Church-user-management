import type { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { asyncHandler, ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { generateMonthlyDues } from "../services/dues-scheduler.js";
import { buildDuesLedger, MONTHLY_DUES_AMOUNT } from "../services/dues-service.js";
import { financeManagers, isAdminRole } from "../utils/permissions.js";
import { normalizePhoneNumber } from "../utils/phone.js";

const cashPaymentSchema = z.object({
  memberId: z.string().uuid().optional(),
  phoneNumber: z.string().optional(),
  months: z.array(z.string()).min(1).optional(),
  weeks: z.array(z.string()).min(1).optional(),
  amount: z.number().positive().optional()
}).refine((value) => Boolean(value.months?.length || value.weeks?.length) || typeof value.amount === "number", {
  message: "Provide dues months or a cash amount."
});

const initiateMomoSchema = z.object({
  member_id: z.string().uuid(),
  month_dates: z.array(z.string()).min(1).optional(),
  week_dates: z.array(z.string()).min(1).optional(),
  total_amount: z.number().positive()
}).refine((value) => Boolean(value.month_dates?.length || value.week_dates?.length), {
  message: "Provide dues months."
});

export function registerDuesRoutes(router: Router) {
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

  router.post(
    "/momo/initiate",
    requireAuth,
    asyncHandler(async (request, response) => {
      const { member_id, month_dates, week_dates, total_amount } = initiateMomoSchema.parse(request.body);
      const targetDates = month_dates ?? week_dates ?? [];

      const member = await prisma.member.findUnique({
        where: { id: member_id },
        select: { date_joined: true }
      });

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
        const oldestDate = oldestUnpaid.week_of.toISOString().split("T")[0];
        const targetDate = new Date(targetDates[0]).toISOString().split("T")[0];

        if (oldestDate !== targetDate) {
          throw new ApiError(400, `Please clear your oldest unpaid month (${oldestDate}) first.`);
        }
      }

      const reference = `PY-${Math.random().toString(36).substring(7).toUpperCase()}`;

      response.json({
        authorization_url: `https://checkout.paystack.com/mock?ref=${reference}&amount=${total_amount * 100}`,
        reference
      });
    })
  );

  router.post(
    "/cash",
    requireAuth,
    requireRoles(financeManagers),
    asyncHandler(async (request, response) => {
      const payload = cashPaymentSchema.parse(request.body);
      await generateMonthlyDues();
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

      let targetMonths = payload.months ?? payload.weeks ?? [];

      if (typeof payload.amount === "number") {
        const normalizedAmount = Number(payload.amount.toFixed(2));
        const exactMonths = normalizedAmount / MONTHLY_DUES_AMOUNT;

        if (!Number.isInteger(exactMonths)) {
          throw new ApiError(400, `Cash payments must be entered in GHS ${MONTHLY_DUES_AMOUNT.toFixed(2)} increments.`);
        }

        if (exactMonths < 1) {
          throw new ApiError(400, `A minimum of GHS ${MONTHLY_DUES_AMOUNT.toFixed(2)} is required to cover one month.`);
        }

        targetMonths = unpaidRows.slice(0, exactMonths).map((row) => row.week_of.toISOString());
      }

      if (!targetMonths.length) {
        throw new ApiError(400, "No outstanding dues months were selected.");
      }

      const now = new Date();
      const updatedRows = [];

      for (const month of targetMonths) {
        const monthDate = new Date(month);
        const existing = await prisma.duesPayment.findUnique({
          where: {
            member_id_week_of: {
              member_id: member.id,
              week_of: monthDate
            }
          }
        });

        const row = existing
          ? await prisma.duesPayment.update({
              where: { id: existing.id },
              data: {
                amount: new Prisma.Decimal(MONTHLY_DUES_AMOUNT.toFixed(2)),
                payment_method: "cash",
                payment_status: "confirmed",
                recorded_by: request.auth!.memberId,
                payment_date: now
              }
            })
          : await prisma.duesPayment.create({
              data: {
                member_id: member.id,
                amount: new Prisma.Decimal(MONTHLY_DUES_AMOUNT.toFixed(2)),
                week_of: monthDate,
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
        monthsCovered: updatedRows.length,
        weeksCovered: updatedRows.length
      });
    })
  );

  router.get(
    "/statement",
    requireAuth,
    asyncHandler(async (request, response) => {
      const year = parseInt(request.query.year as string) || new Date().getFullYear();
      const memberId = (request.query.member_id as string) || request.auth!.memberId;

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
      const yearItems = ledgerData.ledger.filter((item) =>
        new Date(item.weekOf).getUTCFullYear() === year &&
        (item.status === "paid" || item.status === "advance")
      );
      const yearSummary = ledgerData.annualBreakdown.find((item) => item.year === year);

      const doc = new PDFDocument({ margin: 50, size: "A4" });

      response.setHeader("Content-Type", "application/pdf");
      response.setHeader("Content-Disposition", `attachment; filename=Victory_Presby_Statement_${year}.pdf`);

      doc.pipe(response);

      const CH_BLUE = "#1a56db";
      const CH_GOLD = "#fbbf24";
      const TEXT_DARK = "#0f172a";
      const TEXT_LIGHT = "#64748b";

      doc.rect(0, 0, 600, 40).fill(CH_BLUE);
      doc.rect(0, 40, 600, 4).fill(CH_GOLD);
      doc.moveDown(2);
      doc.fillColor(CH_BLUE).fontSize(24).font("Helvetica-Bold").text("Victory Presby Church", { align: "center" });
      doc.fontSize(10).font("Helvetica").fillColor(TEXT_LIGHT).text("Young People's Guild (YPG)", { align: "center" }).moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#e2e8f0").stroke().moveDown(1.5);

      doc.fillColor(TEXT_DARK).fontSize(16).font("Helvetica-Bold").text("DUES STATEMENT", { align: "left" });
      doc.fontSize(9).font("Helvetica").fillColor(TEXT_LIGHT).text(`Period: January ${year} - December ${year}`).moveDown();

      const detailsTop = doc.y;
      doc.rect(50, detailsTop, 500, 80).fill("#f8fafc");
      doc.rect(50, detailsTop, 2, 80).fill(CH_BLUE);

      doc.fillColor(TEXT_DARK).fontSize(10).font("Helvetica-Bold").text("MEMBER DETAILS", 70, detailsTop + 15);
      doc.font("Helvetica").fontSize(11).text(`${member.first_name} ${member.last_name}`, 70, detailsTop + 35);
      doc.fontSize(9).fillColor(TEXT_LIGHT).text(`Team: ${member.team?.name || "N/A"} • ID: ${member.id.split("-")[0].toUpperCase()}`, 70, detailsTop + 50);

      doc.fillColor(TEXT_DARK).fontSize(10).font("Helvetica-Bold").text("ANNUAL SUMMARY", 350, detailsTop + 15);
      doc.fontSize(14).fillColor(CH_BLUE).text(`GHS ${yearSummary?.totalPaid?.toFixed(2) || "0.00"}`, 350, detailsTop + 35);
      doc.fontSize(8).fillColor(TEXT_LIGHT).font("Helvetica").text("Total Confirmed Payments", 350, detailsTop + 55);

      doc.moveDown(4);

      const tableTop = doc.y;
      doc.rect(50, tableTop, 500, 25).fill(CH_BLUE);
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      doc.text("DATE", 65, tableTop + 8);
      doc.text("MONTH", 165, tableTop + 8);
      doc.text("STATUS", 265, tableTop + 8);
      doc.text("METHOD", 365, tableTop + 8);
      doc.text("AMOUNT", 465, tableTop + 8, { align: "right", width: 70 });

      let currentY = tableTop + 25;
      doc.font("Helvetica").fontSize(9).fillColor(TEXT_DARK);

      if (yearItems.length === 0) {
        doc.text("No confirmed payments found for this period.", 50, currentY + 20, { align: "center", width: 500 });
      } else {
        yearItems.forEach((item, index) => {
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          if (index % 2 === 0) {
            doc.rect(50, currentY, 500, 20).fill("#f1f5f9");
          }

          doc.fillColor(TEXT_DARK);
          doc.text(new Date(item.weekOf).toLocaleDateString("en-GB"), 65, currentY + 6);
          doc.text(item.monthName ?? new Date(item.weekOf).toLocaleDateString("en-GB", { month: "long" }), 165, currentY + 6);
          doc.fillColor(CH_BLUE).font("Helvetica-Bold").text("PAID", 265, currentY + 6);
          doc.fillColor(TEXT_DARK).font("Helvetica").text(item.method?.toUpperCase() || "CASH", 365, currentY + 6);
          doc.font("Helvetica-Bold").text(`GHS ${item.amount.toFixed(2)}`, 465, currentY + 6, { align: "right", width: 70 });

          currentY += 20;
        });
      }

      const footerY = 780;
      doc.moveTo(50, footerY - 10).lineTo(550, footerY - 10).strokeColor("#e2e8f0").stroke();
      doc.fontSize(8).fillColor(TEXT_LIGHT).text("Victory Presbyterian Church - YPG Fellowship Management System", 50, footerY, { align: "center", width: 500 });
      doc.text(`This is a computer generated statement. Date: ${new Date().toLocaleString()}`, 50, footerY + 12, { align: "center", width: 500 });

      doc.end();
    })
  );

  router.get(
    "/reports",
    requireAuth,
    requireRoles(financeManagers),
    asyncHandler(async (_request, response) => {
      const allRows = await prisma.duesPayment.findMany({
        include: { member: true },
        orderBy: { week_of: "desc" }
      });

      const now = new Date();
      const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const currentYear = now.getUTCFullYear();

      const totalCollectedThisMonth = allRows
        .filter((row) => row.payment_status === "confirmed" && row.payment_date && row.payment_date >= currentMonthStart)
        .reduce((sum, row) => sum + Number(row.amount), 0);

      const currentYearRows = allRows.filter((row) => row.week_of.getUTCFullYear() === currentYear);
      const totalReceivedSoFar = currentYearRows
        .filter((row) => row.payment_status === "confirmed")
        .reduce((sum, row) => sum + Number(row.amount), 0);

      const activeMembersCount = await prisma.member.count({ where: { is_active: true } });
      const projectedYearAmount = activeMembersCount * 12 * MONTHLY_DUES_AMOUNT;

      const paidByMember = new Map<string, number>();
      currentYearRows
        .filter((row) => row.payment_status === "confirmed")
        .forEach((row) => {
          paidByMember.set(row.member_id, (paidByMember.get(row.member_id) ?? 0) + Number(row.amount));
        });

      const topPayers = [...paidByMember.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([memberId, amountPaid]) => {
          const row = currentYearRows.find((item) => item.member_id === memberId)!;
          return {
            memberId,
            firstName: row.member.first_name,
            lastName: row.member.last_name,
            amountPaid,
            profilePhotoUrl: row.member.profile_photo_url
          };
        });

      const history = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - 5 + i);
        const year = d.getFullYear();
        const month = d.getMonth();
        const monthStart = new Date(Date.UTC(year, month, 1));
        const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
        
        const amount = allRows
          .filter(row => row.payment_status === "confirmed" && row.payment_date && row.payment_date >= monthStart && row.payment_date <= monthEnd)
          .reduce((sum, row) => sum + Number(row.amount), 0);
          
        return {
          month: monthStart.toLocaleString("default", { month: "short" }),
          amount: Math.round(amount)
        };
      });

      response.json({
        summary: {
          totalCollectedThisWeek: totalCollectedThisMonth,
          totalCollectedThisMonth,
          totalReceivedSoFar,
          projectedYearAmount,
          activeMembersCount,
          currentYear
        },
        topPayers,
        alerts: {
          twoMonthsOutstanding: []
        },
        history
      });
    })
  );
}
