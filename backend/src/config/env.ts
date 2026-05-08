import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  APP_URL: z.string().url().default("http://localhost:4000"),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  COOKIE_DOMAIN: z.string().optional(),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),
  ATTENDANCE_WINDOW_MINUTES: z.coerce.number().default(60),
  TOTP_STEP_SECONDS: z.coerce.number().default(20),
  HUBTEL_CLIENT_ID: z.string().optional(),
  HUBTEL_CLIENT_SECRET: z.string().optional(),
  HUBTEL_SENDER_ID: z.string().default("ChurchYouth"),
  SMS_PROVIDER_MODE: z.enum(["mock", "hubtel"]).default("mock"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  MEDIA_PROVIDER_MODE: z.enum(["mock", "cloudinary"]).default("mock"),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
  DEV_AUTH_BYPASS_ENABLED: z.enum(["true", "false"]).optional()
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  DEV_AUTH_BYPASS_ENABLED:
    parsedEnv.DEV_AUTH_BYPASS_ENABLED !== undefined
      ? parsedEnv.DEV_AUTH_BYPASS_ENABLED === "true"
      : parsedEnv.NODE_ENV !== "production" && parsedEnv.SMS_PROVIDER_MODE === "mock"
};
