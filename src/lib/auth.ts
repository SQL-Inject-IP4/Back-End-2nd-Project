import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../generated/prisma/client";

export const AUTH_COOKIE_NAME = "pekapal_auth";
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  name: string | null;
};

export function resolveUserRole(email: string): UserRole {
  void email;
  return "EDITOR";
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions() {
  const sameSite: "lax" | "none" = env.NODE_ENV === "production" ? "none" : "lax";

  return {
    httpOnly: true,
    sameSite,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_MS
  };
}
