import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma.js";
import { MONTHLY_DUES_AMOUNT } from "./dues-service.js";

export async function generateMonthlyDues(targetDate = new Date()) {
  const targetYear = targetDate.getUTCFullYear();
  const members = await prisma.member.findMany({
    where: { is_active: true },
    select: { id: true, date_joined: true }
  });

  if (!members.length) {
    return 0;
  }

  const rows = members.flatMap((member) => {
    const months: Array<{
      member_id: string;
      amount: Prisma.Decimal;
      week_of: Date;
      payment_status: "pending";
    }> = [];

    const memberJoinMonth = member.date_joined
      ? new Date(Date.UTC(member.date_joined.getUTCFullYear(), member.date_joined.getUTCMonth(), 1))
      : new Date(Date.UTC(targetYear, 0, 1));

    for (let month = 0; month < 12; month += 1) {
      const monthStart = new Date(Date.UTC(targetYear, month, 1));
      if (monthStart < memberJoinMonth) continue;

      months.push({
        member_id: member.id,
        amount: new Prisma.Decimal(MONTHLY_DUES_AMOUNT.toFixed(2)),
        week_of: monthStart,
        payment_status: "pending"
      });
    }

    return months;
  });

  const result = await prisma.duesPayment.createMany({
    data: rows,
    skipDuplicates: true
  });

  return result.count;
}

export const generateWeeklyDues = generateMonthlyDues;

export function startSchedulers() {
  void generateMonthlyDues();
  const interval = 12 * 60 * 60 * 1000;
  setInterval(() => {
    void generateMonthlyDues();
  }, interval);
}
