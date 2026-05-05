import type { MemberRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/http.js";
import { verifyAccessToken } from "../lib/auth.js";

async function attachAuth(request: Request) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return;
  }

  const token = header.slice("Bearer ".length);
  const payload = verifyAccessToken(token);
  const member = await prisma.member.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      role: true,
      branch_id: true,
      is_active: true
    }
  });

  if (!member || !member.is_active) {
    throw new ApiError(401, "Authentication required.");
  }

  request.auth = {
    memberId: member.id,
    role: member.role,
    branchId: member.branch_id
  };
}

export async function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    await attachAuth(request);
    next();
  } catch {
    next();
  }
}

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  await attachAuth(request);

  if (!request.auth) {
    return next(new ApiError(401, "Authentication required."));
  }

  next();
}

export function requireRoles(roles: MemberRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth) {
      return next(new ApiError(401, "Authentication required."));
    }

    if (!roles.includes(request.auth.role)) {
      return next(new ApiError(403, "You do not have access to this resource."));
    }

    next();
  };
}
