import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  secret: env.AUTH_SECRET,
  baseURL: env.BACKEND_ORIGIN,
  basePath: "/api/auth",
  trustedOrigins: [env.FRONTEND_URL, ...env.FRONTEND_URLS, env.BACKEND_ORIGIN],
  defaultCookieAttributes: {
    httpOnly: true,
    path: "/",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production"
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production"
  },
  cookiePrefix: "pekapal",
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account"
    }
  }
});

export const betterAuthHandler = toNodeHandler(auth);

export type BetterAuthSessionResponse = {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
} | null;

export async function invokeBetterAuth(
  path: string,
  init: RequestInit = {},
  sourceHeaders?: Headers
): Promise<Response> {
  const headers = new Headers(sourceHeaders);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const request = new Request(new URL(path, env.BACKEND_ORIGIN), {
    ...init,
    headers,
    redirect: "manual"
  });

  return auth.handler(request);
}

export function getRequestHeaders(req: ExpressRequest): Headers {
  return fromNodeHeaders(req.headers);
}

export async function getSessionFromRequest(req: ExpressRequest): Promise<BetterAuthSessionResponse> {
  const response = await invokeBetterAuth("/api/auth/get-session", {
    method: "GET"
  }, getRequestHeaders(req));

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<BetterAuthSessionResponse>;
}

export async function sendBetterAuthResponse(response: Response, res: ExpressResponse): Promise<void> {
  applyBetterAuthHeaders(response, res);
  res.status(response.status);
  const body = await response.arrayBuffer();
  res.send(Buffer.from(body));
}

export function applyBetterAuthHeaders(
  response: Response,
  res: ExpressResponse,
  options: { includeRegularHeaders?: boolean } = {}
): void {
  const { includeRegularHeaders = true } = options;
  const setCookieValues = getSetCookieValues(response.headers);

  if (includeRegularHeaders) {
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() === "set-cookie") {
        continue;
      }

      res.setHeader(key, value);
    }
  }

  for (const cookie of setCookieValues) {
    res.append("set-cookie", cookie);
  }
}

function getSetCookieValues(headers: Headers): string[] {
  if ("getSetCookie" in headers && typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const combined = headers.get("set-cookie");
  return combined ? [combined] : [];
}
