import type { DuesPayment } from "@prisma/client";

export const MONTHLY_DUES_AMOUNT = 2;
export const WEEKLY_DUES_AMOUNT = MONTHLY_DUES_AMOUNT;

export type DuesStatus = "paid" | "unpaid" | "advance";

export interface LedgerItem {
  id: string;
  memberId: string;
  amount: number;
  weekOf: Date;
  periodOf: Date;
  weekNumber: number;
  monthNumber: number;
  monthName: string;
  status: DuesStatus;
  method: string | null;
  paymentDate: Date | null;
  reference?: string | null;
}

export function buildDuesLedger(rows: DuesPayment[], memberJoinedDate?: Date) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const startYear = memberJoinedDate ? memberJoinedDate.getUTCFullYear() : currentYear;
  const joinedMonthStart = memberJoinedDate ? getMonthStart(memberJoinedDate) : undefined;

  const allMonths: Date[] = [];
  for (let year = startYear; year <= currentYear; year++) {
    for (let month = 0; month < 12; month += 1) {
      const monthStart = new Date(Date.UTC(year, month, 1));
      if (joinedMonthStart && monthStart < joinedMonthStart) continue;
      allMonths.push(monthStart);
    }
  }

  const rowMap = new Map(rows.map((row) => [toIsoDate(row.week_of), row]));

  const ledger: LedgerItem[] = allMonths.map((monthStart) => {
    const isoDate = toIsoDate(monthStart);
    const row = rowMap.get(isoDate);

    return {
      id: row?.id || `unpaid-${isoDate}`,
      memberId: row?.member_id || "",
      amount: row ? Number(row.amount) : MONTHLY_DUES_AMOUNT,
      weekOf: monthStart,
      periodOf: monthStart,
      weekNumber: monthStart.getUTCMonth() + 1,
      monthNumber: monthStart.getUTCMonth() + 1,
      monthName: monthStart.toLocaleString("en", { month: "long", timeZone: "UTC" }),
      status: row?.payment_status === "confirmed" ? "paid" : "unpaid",
      method: row?.payment_method || null,
      paymentDate: row?.payment_date || null,
      reference: row?.paystack_reference || null
    };
  });

  const totalConfirmedAmount = rows
    .filter((row) => row.payment_status === "confirmed")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const currentMonthStart = getMonthStart(now);
  const dueMonths = ledger.filter((item) => item.weekOf <= currentMonthStart);
  const totalRequiredForDueMonths = dueMonths.length * MONTHLY_DUES_AMOUNT;
  let surplus = totalConfirmedAmount - totalRequiredForDueMonths;

  if (surplus > 0) {
    const futureMonthsCount = Math.floor(surplus / MONTHLY_DUES_AMOUNT);
    const baseDate = allMonths.length > 0 ? allMonths[allMonths.length - 1] : getMonthStart(now);

    for (let i = 1; i <= futureMonthsCount; i += 1) {
      const nextMonth = addMonths(baseDate, i);

      ledger.push({
        id: `advance-${nextMonth.toISOString()}`,
        memberId: "",
        amount: MONTHLY_DUES_AMOUNT,
        weekOf: nextMonth,
        periodOf: nextMonth,
        weekNumber: nextMonth.getUTCMonth() + 1,
        monthNumber: nextMonth.getUTCMonth() + 1,
        monthName: nextMonth.toLocaleString("en", { month: "long", timeZone: "UTC" }),
        status: "advance",
        method: "carry-forward",
        paymentDate: now
      });
    }
  }

  const sortedLedger = ledger.sort((left, right) => right.weekOf.getTime() - left.weekOf.getTime());
  const years = [...new Set(sortedLedger.map((item) => item.weekOf.getUTCFullYear()))].sort((left, right) => right - left);

  const annualBreakdown = years.map((year) => {
    const yearItems = sortedLedger.filter((item) => item.weekOf.getUTCFullYear() === year);
    const paidItems = yearItems.filter((item) => item.status === "paid" || item.status === "advance");
    const outstandingItems = yearItems.filter((item) => item.status === "unpaid" && item.weekOf <= currentMonthStart);

    return {
      year,
      totalPaid: paidItems.length * MONTHLY_DUES_AMOUNT,
      totalOutstanding: outstandingItems.length * MONTHLY_DUES_AMOUNT,
      totalMonths: yearItems.length,
      monthsPaid: paidItems.length,
      monthsPending: outstandingItems.length,
      totalWeeks: yearItems.length,
      weeksPaid: paidItems.length,
      weeksPending: outstandingItems.length
    };
  });

  const totalPaid = annualBreakdown.reduce((sum, year) => sum + year.totalPaid, 0);
  const totalOutstanding = annualBreakdown.reduce((sum, year) => sum + year.totalOutstanding, 0);
  const monthsPaid = annualBreakdown.reduce((sum, year) => sum + year.monthsPaid, 0);
  const monthsBehind = annualBreakdown.reduce((sum, year) => sum + year.monthsPending, 0);

  return {
    ledger: sortedLedger.map((item) => ({
      ...item,
      weekOf: toIsoDateTime(item.weekOf),
      periodOf: toIsoDateTime(item.periodOf)
    })),
    summary: {
      totalPaid,
      totalOutstanding,
      monthsPaid,
      monthsBehind,
      totalMonths: ledger.length,
      weeksPaid: monthsPaid,
      weeksBehind: monthsBehind,
      totalWeeks: ledger.length,
      statusMessage:
        totalOutstanding > 0
          ? `You're ${monthsBehind} ${monthsBehind === 1 ? "month" : "months"} behind`
          : surplus > 0
            ? `You're ${Math.floor(surplus / MONTHLY_DUES_AMOUNT)} ${Math.floor(surplus / MONTHLY_DUES_AMOUNT) === 1 ? "month" : "months"} ahead`
            : "You're all caught up!"
    },
    annualBreakdown
  };
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, count: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

function toIsoDate(value: Date) {
  return value.toISOString().split("T")[0];
}

function toIsoDateTime(value: Date) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : new Date().toISOString();
}
