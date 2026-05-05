import type { Router } from "express";

import { z } from "zod";

import { asyncHandler } from "../lib/http.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { smsProvider } from "../providers/sms.js";
import { adminRoles } from "../utils/permissions.js";

const notificationSchema = z.object({
  phoneNumber: z.string().min(8),
  message: z.string().min(3)
});

export function registerNotificationRoutes(router: Router) {
  router.post(
    "/send",
    requireAuth,
    requireRoles(adminRoles),
    asyncHandler(async (request, response) => {
      const payload = notificationSchema.parse(request.body);
      await smsProvider.send({
        to: payload.phoneNumber,
        message: payload.message
      });

      response.status(202).json({
        message: "Notification queued."
      });
    })
  );
}
