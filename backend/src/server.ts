import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { ensureDefaultBranch } from "./services/branch-service.js";
import { startSchedulers } from "./services/dues-scheduler.js";

async function bootstrap() {
  await prisma.$connect();
  await ensureDefaultBranch();
  startSchedulers();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.info(`Backend listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
