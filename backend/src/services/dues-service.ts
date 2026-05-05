import type { DuesPayment } from "@prisma/client";

export const WEEKLY_DUES_AMOUNT = 2;

export function buildDuesLedger(rows: DuesPayment[]) {
  const sortedRows = [...rows].sort((left, right) => right.week_of.getTime() - left.week_of.getTime());
  const years = [...new Set(sortedRows.map((row) => row.week_of.getUTCFullYear()))].sort((left, right) => right - left);

  const annualBreakdown = years.map((year) => {
    const yearRows = sortedRows.filter((row) => row.week_of.getUTCFullYear() === year);
    const weeksPaid = yearRows.filter((row) => row.payment_status === "confirmed").length;
    const totalWeeks = countMondaysInYear(year);
    const totalDue = totalWeeks * WEEKLY_DUES_AMOUNT;
    const totalPaid = weeksPaid * WEEKLY_DUES_AMOUNT;
    const totalOutstanding = Math.max(totalDue - totalPaid, 0);

    return {
      year,
      totalDue,
      totalPaid,
      totalOutstanding,
      totalWeeks,
      weeksPaid,
      weeksPending: Math.max(totalWeeks - weeksPaid, 0)
    };
  });

  const summary = annualBreakdown.reduce(
    (accumulator, year) => ({
      totalDue: accumulator.totalDue + year.totalDue,
      totalPaid: accumulator.totalPaid + year.totalPaid,
      totalOutstanding: accumulator.totalOutstanding + year.totalOutstanding,
      weeksPaid: accumulator.weeksPaid + year.weeksPaid,
      weeksBehind: accumulator.weeksBehind + year.weeksPending,
      totalWeeks: accumulator.totalWeeks + year.totalWeeks
    }),
    {
      totalDue: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      weeksPaid: 0,
      weeksBehind: 0,
      totalWeeks: 0
    }
  );

  return {
    ledger: sortedRows.map((row) => ({
      id: row.id,
      memberId: row.member_id,
      amount: Number(row.amount),
      weekOf: row.week_of,
      status: row.payment_status,
      method: row.payment_method,
      paymentDate: row.payment_date
    })),
    summary,
    annualBreakdown
  };
}

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
