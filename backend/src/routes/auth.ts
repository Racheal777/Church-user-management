import type { Response, Router } from "express";

import { z } from "zod";

import { env } from "../config/env.js";
import { hashToken, signAccessToken, signRefreshToken, generateOtpCode } from "../lib/auth.js";
import { asyncHandler, ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { smsProvider } from "../providers/sms.js";
import { buildPermissions } from "../utils/permissions.js";
import { normalizePhoneNumber } from "../utils/phone.js";

const requestOtpSchema = z.object({
  phoneNumber: z.string().min(8)
});

const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(8),
  otpCode: z.string().length(6)
});

const devLoginSchema = z.object({
  phoneNumber: z.string().min(8)
});

function setRefreshCookie(response: Response, token: string) {
  response.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/api/auth"
  });
}

async function buildSessionPayload(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      team: true
    }
  });

  if (!member || !member.is_active) {
    throw new ApiError(401, "Member account is inactive.");
  }

  return {
    member: {
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      phoneNumber: member.phone_number,
      whatsappNumber: member.whatsapp_number,
      email: member.email,
      dateOfBirth: member.date_of_birth,
      maritalStatus: member.marital_status,
      dateJoined: member.date_joined,
      profilePhotoUrl: member.profile_photo_url,
      role: member.role,
      team: member.team
        ? {
            id: member.team.id,
            name: member.team.name,
            color: member.team.color
          }
        : null,
      permissions: buildPermissions(member.role)
    },
    accessToken: signAccessToken({
      sub: member.id,
      role: member.role,
      branchId: member.branch_id
    })
  };
}

async function issueSession(memberId: string, request: Parameters<Router["post"]>[1] extends never ? never : any, response: Response) {
  const refreshToken = signRefreshToken(memberId);
  await prisma.refreshToken.create({
    data: {
      member_id: memberId,
      token_hash: refreshToken.tokenHash,
      expires_at: refreshToken.expiresAt,
      user_agent: request.headers["user-agent"],
      ip_address: request.ip
    }
  });

  setRefreshCookie(response, refreshToken.rawToken);
  response.json(await buildSessionPayload(memberId));
}

export function registerAuthRoutes(router: Router) {
  router.post(
    "/request-otp",
    asyncHandler(async (request, response) => {
      const payload = requestOtpSchema.parse(request.body);
      const phoneNumber = normalizePhoneNumber(payload.phoneNumber);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentRequests = await prisma.otp.count({
        where: {
          phone_number: phoneNumber,
          created_at: {
            gte: oneHourAgo
          }
        }
      });

      if (recentRequests >= 3) {
        throw new ApiError(429, "Too many OTP requests. Try again later.");
      }

      const member = await prisma.member.findUnique({
        where: { phone_number: phoneNumber }
      });

      if (member?.is_active) {
        const otpCode = generateOtpCode();
        await prisma.otp.create({
          data: {
            phone_number: phoneNumber,
            otp_code: otpCode,
            expires_at: new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000),
            member_id: member.id
          }
        });

        await smsProvider.send({
          to: phoneNumber,
          message: `${member.first_name}, your login code is ${otpCode}. It expires in ${env.OTP_EXPIRY_MINUTES} minutes.`
        });
      }

      response.json({
        message: "If a matching member account exists, an OTP has been sent."
      });
    })
  );

  router.post(
    "/verify-otp",
    asyncHandler(async (request, response) => {
      const payload = verifyOtpSchema.parse(request.body);
      const phoneNumber = normalizePhoneNumber(payload.phoneNumber);

      const otp = await prisma.otp.findFirst({
        where: {
          phone_number: phoneNumber,
          otp_code: payload.otpCode,
          used: false,
          expires_at: {
            gt: new Date()
          }
        },
        orderBy: {
          created_at: "desc"
        }
      });

      if (!otp) {
        throw new ApiError(401, "Invalid or expired OTP.");
      }

      if (!otp.member_id) {
        throw new ApiError(401, "No member account is linked to this phone number.");
      }

      await prisma.otp.update({
        where: { id: otp.id },
        data: { used: true }
      });

      await issueSession(otp.member_id, request, response);
    })
  );

  router.post(
    "/dev-login",
    asyncHandler(async (request, response) => {
      if (!env.DEV_AUTH_BYPASS_ENABLED) {
        throw new ApiError(404, "Development login bypass is disabled.");
      }

      const payload = devLoginSchema.parse(request.body);
      const phoneNumber = normalizePhoneNumber(payload.phoneNumber);
      const member = await prisma.member.findUnique({
        where: { phone_number: phoneNumber }
      });

      if (!member || !member.is_active) {
        throw new ApiError(401, "No active member account is linked to this phone number.");
      }

      await issueSession(member.id, request, response);
    })
  );

  router.post(
    "/refresh",
    asyncHandler(async (request, response) => {
      const currentToken = request.cookies.refreshToken as string | undefined;
      if (!currentToken) {
        throw new ApiError(401, "Refresh token is missing.");
      }

      const existing = await prisma.refreshToken.findUnique({
        where: { token_hash: hashToken(currentToken) },
        include: {
          member: true
        }
      });

      if (!existing || existing.expires_at <= new Date() || !existing.member.is_active) {
        throw new ApiError(401, "Refresh token is invalid.");
      }

      const rotated = signRefreshToken(existing.member_id);
      await prisma.$transaction([
        prisma.refreshToken.delete({ where: { id: existing.id } }),
        prisma.refreshToken.create({
          data: {
            member_id: existing.member_id,
            token_hash: rotated.tokenHash,
            expires_at: rotated.expiresAt,
            user_agent: request.headers["user-agent"],
            ip_address: request.ip,
            last_used_at: new Date()
          }
        })
      ]);

      setRefreshCookie(response, rotated.rawToken);
      response.json(await buildSessionPayload(existing.member_id));
    })
  );

  router.post(
    "/logout",
    asyncHandler(async (request, response) => {
      const currentToken = request.cookies.refreshToken as string | undefined;
      if (currentToken) {
        await prisma.refreshToken.deleteMany({
          where: { token_hash: hashToken(currentToken) }
        });
      }

      response.clearCookie("refreshToken", {
        path: "/api/auth",
        domain: env.COOKIE_DOMAIN || undefined
      });
      response.status(204).send();
    })
  );

  router.get(
    "/me",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await buildSessionPayload(request.auth!.memberId));
    })
  );
}
