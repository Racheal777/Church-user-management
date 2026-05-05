import { PrismaClient, Prisma } from "@prisma/client";

import { getWeekMonday } from "../src/utils/dates.js";

const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Default Branch",
      location: "Main Assembly"
    }
  });

  const blueTeam = await prisma.team.upsert({
    where: {
      name_branch_id: {
        name: "Blue Flames",
        branch_id: branch.id
      }
    },
    update: { color: "#0d3b66" },
    create: {
      name: "Blue Flames",
      color: "#0d3b66",
      branch_id: branch.id
    }
  });

  const redTeam = await prisma.team.upsert({
    where: {
      name_branch_id: {
        name: "Red Revival",
        branch_id: branch.id
      }
    },
    update: { color: "#b22234" },
    create: {
      name: "Red Revival",
      color: "#b22234",
      branch_id: branch.id
    }
  });

  const president = await prisma.member.upsert({
    where: { phone_number: "+233200000001" },
    update: {},
    create: {
      first_name: "Ama",
      last_name: "Owusu",
      phone_number: "+233200000001",
      email: "ama@example.com",
      role: "president",
      team_id: blueTeam.id,
      branch_id: branch.id,
      date_joined: new Date()
    }
  });

  const secretary = await prisma.member.upsert({
    where: { phone_number: "+233200000002" },
    update: {},
    create: {
      first_name: "Kojo",
      last_name: "Mensah",
      phone_number: "+233200000002",
      email: "kojo@example.com",
      role: "secretary",
      team_id: redTeam.id,
      branch_id: branch.id,
      created_by: president.id,
      date_joined: new Date()
    }
  });

  const finance = await prisma.member.upsert({
    where: { phone_number: "+233200000003" },
    update: {},
    create: {
      first_name: "Efua",
      last_name: "Boateng",
      phone_number: "+233200000003",
      email: "efua@example.com",
      role: "financial_secretary",
      team_id: blueTeam.id,
      branch_id: branch.id,
      created_by: president.id,
      date_joined: new Date()
    }
  });

  const members = [president, secretary, finance];
  const currentMonday = getWeekMonday(new Date());

  for (const member of members) {
    for (let week = 0; week < 4; week += 1) {
      const weekDate = new Date(currentMonday);
      weekDate.setUTCDate(currentMonday.getUTCDate() - week * 7);
      await prisma.duesPayment.upsert({
        where: {
          member_id_week_of: {
            member_id: member.id,
            week_of: weekDate
          }
        },
        update: {},
        create: {
          member_id: member.id,
          amount: new Prisma.Decimal("2.00"),
          week_of: weekDate,
          payment_status: week < 2 ? "confirmed" : "pending",
          payment_method: week < 2 ? "cash" : null,
          recorded_by: week < 2 ? finance.id : null,
          payment_date: week < 2 ? new Date() : null
        }
      });
    }
  }

  console.info("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
