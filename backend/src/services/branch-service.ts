import { prisma } from "../lib/prisma.js";

export async function ensureDefaultBranch() {
  const existing = await prisma.branch.findFirst({
    where: { name: "Default Branch" }
  });

  if (existing) {
    return existing;
  }

  return prisma.branch.create({
    data: {
      name: "Default Branch",
      location: "Main Assembly"
    }
  });
}
