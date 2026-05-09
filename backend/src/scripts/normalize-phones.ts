import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(phone: string) {
  let cleaned = phone.replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("0")) {
    cleaned = "+233" + cleaned.slice(1);
  }
  if (cleaned && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

async function main() {
  const members = await prisma.member.findMany();
  console.log(`Checking ${members.length} members...`);

  for (const member of members) {
    const normPhone = normalize(member.phone_number);
    const normWhatsApp = member.whatsapp_number ? normalize(member.whatsapp_number) : null;

    if (normPhone !== member.phone_number || normWhatsApp !== member.whatsapp_number) {
      console.log(`Updating ${member.first_name} ${member.last_name}: ${member.phone_number} -> ${normPhone}`);
      await prisma.member.update({
        where: { id: member.id },
        data: {
          phone_number: normPhone,
          whatsapp_number: normWhatsApp
        }
      });
    }
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
