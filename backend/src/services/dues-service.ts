import type { DuesPayment } from "@prisma/client";

export const WEEKLY_DUES_AMOUNT = 2;

export type DuesStatus = "paid" | "unpaid" | "advance";

export interface LedgerItem {
  id: string;
  memberId: string;
  amount: number;
  weekOf: Date;
  weekNumber: number;
  status: DuesStatus;
  method: string | null;
  paymentDate: Date | null;
  reference?: string | null;
}

export function buildDuesLedger(rows: DuesPayment[], memberJoinedDate?: Date) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const startYear = memberJoinedDate ? memberJoinedDate.getUTCFullYear() : currentYear;
  
  const horizon = new Date(now);
  horizon.setUTCDate(horizon.getUTCDate() + 84); // Look 12 weeks (3 months) ahead
  
  const allMondays: Date[] = [];
  for (let year = startYear; year <= currentYear + 1; year++) {
    const firstMonday = getFirstMondayOfYear(year);
    const lastDayOfYear = new Date(Date.UTC(year, 11, 31));
    
    for (let cursor = new Date(firstMonday); cursor <= lastDayOfYear && cursor <= horizon; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
      if (memberJoinedDate && cursor < memberJoinedDate) continue;
      allMondays.push(new Date(cursor));
    }
  }

  // 2. Map existing rows to a lookup
  const rowMap = new Map(rows.map(r => [r.week_of.toISOString().split('T')[0], r]));

  // 3. Build the ledger
  const ledger: LedgerItem[] = allMondays.map(monday => {
    const isoDate = monday.toISOString().split('T')[0];
    const row = rowMap.get(isoDate);

    return {
      id: row?.id || `unpaid-${isoDate}`,
      memberId: row?.member_id || "",
      amount: row ? Number(row.amount) : WEEKLY_DUES_AMOUNT,
      weekOf: monday,
      weekNumber: getWeekNumber(monday),
      status: row?.payment_status === "confirmed" ? "paid" : "unpaid",
      method: row?.payment_method || null,
      paymentDate: row?.payment_date || null,
      reference: row?.paystack_reference || null
    };
  });

  // 4. Handle Carry-Forward (Advance) Logic
  // Total paid by member
  const totalConfirmedAmount = rows
    .filter(r => r.payment_status === "confirmed")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  // Total required for weeks passed so far
  const totalRequiredForPassedWeeks = ledger.length * WEEKLY_DUES_AMOUNT;
  
  // Calculate surplus
  let surplus = totalConfirmedAmount - totalRequiredForPassedWeeks;

  // If there's surplus, mark future weeks as "advance"
  if (surplus > 0) {
    const futureWeeksCount = Math.floor(surplus / WEEKLY_DUES_AMOUNT);
    // Fallback to current week's Monday if they haven't had any due weeks yet
    const baseDate = allMondays.length > 0 
      ? allMondays[allMondays.length - 1] 
      : getFirstMondayOfYear(now.getUTCFullYear());
    
    for (let i = 1; i <= futureWeeksCount; i++) {
      const nextMonday = new Date(baseDate);
      // If we are starting from a fallback, we might need to skip already passed weeks
      // But buildDuesLedger is usually called for the "current" view
      nextMonday.setUTCDate(nextMonday.getUTCDate() + (i * 7));
      
      ledger.push({
        id: `advance-${nextMonday.toISOString()}`,
        memberId: "",
        amount: WEEKLY_DUES_AMOUNT,
        weekOf: nextMonday,
        weekNumber: getWeekNumber(nextMonday),
        status: "advance",
        method: "carry-forward",
        paymentDate: now
      });
    }
  }

  // 5. Group by Year and Calculate Summaries
  const sortedLedger = ledger.sort((a, b) => b.weekOf.getTime() - a.weekOf.getTime());
  const years = [...new Set(sortedLedger.map(i => i.weekOf.getUTCFullYear()))].sort((a, b) => b - a);

  const annualBreakdown = years.map(year => {
    const yearItems = sortedLedger.filter(i => i.weekOf.getUTCFullYear() === year);
    const paidItems = yearItems.filter(i => i.status === "paid" || i.status === "advance");
    
    // Outstanding only includes UNPAID weeks that have already passed (or are current)
    const outstandingItems = yearItems.filter(i => i.status === "unpaid" && i.weekOf <= now);

    return {
      year,
      totalPaid: paidItems.length * WEEKLY_DUES_AMOUNT,
      totalOutstanding: outstandingItems.length * WEEKLY_DUES_AMOUNT,
      totalWeeks: yearItems.length,
      weeksPaid: paidItems.length,
      weeksPending: outstandingItems.length
    };
  });

  const totalPaid = annualBreakdown.reduce((sum, y) => sum + y.totalPaid, 0);
  const totalOutstanding = annualBreakdown.reduce((sum, y) => sum + y.totalOutstanding, 0);
  const weeksPaid = annualBreakdown.reduce((sum, y) => sum + y.weeksPaid, 0);
  const weeksBehind = annualBreakdown.reduce((sum, y) => sum + y.weeksPending, 0);

  return {
    ledger: sortedLedger.map(item => ({
      ...item,
      weekOf: item.weekOf instanceof Date && !isNaN(item.weekOf.getTime()) 
        ? item.weekOf.toISOString() 
        : new Date().toISOString()
    })),
    summary: {
      totalPaid,
      totalOutstanding,
      weeksPaid,
      weeksBehind,
      totalWeeks: ledger.length,
      statusMessage: totalOutstanding > 0 
        ? `You're ${weeksBehind} weeks behind`
        : surplus > 0 
          ? `You're ${Math.floor(surplus / WEEKLY_DUES_AMOUNT)} weeks ahead`
          : "You're all caught up!"
    },
    annualBreakdown
  };
}

function getFirstMondayOfYear(year: number) {
  const date = new Date(Date.UTC(year, 0, 1));
  while (date.getUTCDay() !== 1) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}
