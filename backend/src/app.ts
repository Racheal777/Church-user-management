import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env.js";
import { buildOpenApiDocument } from "./lib/openapi.js";
import { errorHandler } from "./middleware/error.js";
import { registerAttendanceRoutes } from "./routes/attendance.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerDuesRoutes } from "./routes/dues.js";
import { registerMemberRoutes } from "./routes/members.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerTeamRoutes } from "./routes/teams.js";
import { registerAnnouncementRoutes } from "./routes/announcements.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowed = [env.APP_URL, "http://localhost:5173", "http://localhost:3000"];
        if (!origin || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_request: express.Request, response: express.Response) => {
    response.json({ status: "YPG Backend Active", timestamp: new Date().toISOString() });
  });

  app.get("/api/health", (_request: express.Request, response: express.Response) => {
    response.json({ status: "ok" });
  });

  app.get("/favicon.ico", (_req: express.Request, res: express.Response) => res.status(204).end());
  app.get("/favicon.png", (_req: express.Request, res: express.Response) => res.status(204).end());

  app.get("/api/openapi.json", (_request: express.Request, response: express.Response) => {
    response.json(buildOpenApiDocument());
  });
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(buildOpenApiDocument()));

  const authRouter = express.Router();
  registerAuthRoutes(authRouter);
  app.use("/api/auth", authRouter);

  const memberRouter = express.Router();
  registerMemberRoutes(memberRouter);
  app.use("/api/members", memberRouter);

  const teamRouter = express.Router();
  registerTeamRoutes(teamRouter);
  app.use("/api/teams", teamRouter);

  const attendanceRouter = express.Router();
  registerAttendanceRoutes(attendanceRouter);
  app.use("/api/attendance", attendanceRouter);

  const duesRouter = express.Router();
  registerDuesRoutes(duesRouter);
  app.use("/api/dues", duesRouter);

  const auditRouter = express.Router();
  registerAuditRoutes(auditRouter);
  app.use("/api/audit-logs", auditRouter);

  const notificationRouter = express.Router();
  registerNotificationRoutes(notificationRouter);
  app.use("/api/notifications", notificationRouter);

  const announcementRouter = express.Router();
  registerAnnouncementRoutes(announcementRouter);
  app.use("/api/announcements", announcementRouter);

  app.use(errorHandler);
  return app;
}

export default createApp();
