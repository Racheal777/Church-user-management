import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma.js";

export async function generateWeeklyDues(targetDate = new Date()) {
  const targetYear = targetDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(targetYear, 0, 1));
  const yearEnd = new Date(Date.UTC(targetYear, 11, 31));
  const members = await prisma.member.findMany({
    where: { is_active: true },
    select: { id: true, date_joined: true }
  });

  if (!members.length) {
    return 0;
  }

  const rows = members.flatMap((member) => {
    const weeks: Array<{
      member_id: string;
      amount: Prisma.Decimal;
      week_of: Date;
      payment_status: "pending";
    }> = [];

    const firstMonday = getFirstMondayOfYear(targetYear);
    const memberJoinDate = member.date_joined || firstMonday;

    for (let cursor = new Date(firstMonday); cursor <= yearEnd; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
      // Skip weeks before member joined
      if (cursor < memberJoinDate) continue;
      
      weeks.push({
        member_id: member.id,
        amount: new Prisma.Decimal("2.00"),
        week_of: new Date(cursor),
        payment_status: "pending"
      });
    }

    return weeks;
  });

  const result = await prisma.duesPayment.createMany({
    data: rows,
    skipDuplicates: true
  });

  return result.count;
}

export function startSchedulers() {
  void generateWeeklyDues();
  const interval = 12 * 60 * 60 * 1000;
  setInterval(() => {
    void generateWeeklyDues();
  }, interval);
}

function getFirstMondayOfYear(year: number) {
  const date = new Date(Date.UTC(year, 0, 1));
  while (date.getUTCDay() !== 1) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}
