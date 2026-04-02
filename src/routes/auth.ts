import { Router } from "express";
import { env } from "../config/env.js";
import { applyBetterAuthHeaders, auth, getRequestHeaders, getSessionFromRequest, sendBetterAuthResponse } from "../lib/better-auth.js";
import { prisma } from "../lib/prisma.js";
import { syncUserRole } from "../lib/rbac.js";
import { createRateLimit } from "../middleware/security.js";

export const authRouter = Router();
const authFlowRateLimit = createRateLimit({
  key: "auth-flow",
  windowMs: 60_000,
  maxRequests: 20
});
const authReadRateLimit = createRateLimit({
  key: "auth-read",
  windowMs: 60_000,
  maxRequests: 120
});

authRouter.get("/google", authFlowRateLimit, async (req, res, next) => {
  try {
    const headers = getRequestHeaders(req);

    if (!headers.has("origin")) {
      headers.set("origin", env.BACKEND_ORIGIN);
    }

    const response = await auth.api.signInSocial({
      headers,
      body: {
        provider: "google",
        callbackURL: env.FRONTEND_LOGIN_SUCCESS_URL,
        errorCallbackURL: env.FRONTEND_LOGIN_FAILURE_URL
      },
      asResponse: true
    });
    const redirectLocation = response.headers.get("location");

    if (!response.ok || !redirectLocation) {
      await sendBetterAuthResponse(response, res);
      return;
    }

    applyBetterAuthHeaders(response, res, { includeRegularHeaders: false });
    res.redirect(302, redirectLocation);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", authFlowRateLimit, async (req, res, next) => {
  try {
    const response = await auth.api.signOut({
      headers: getRequestHeaders(req),
      asResponse: true
    });

    await sendBetterAuthResponse(response, res);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authReadRateLimit, async (req, res, next) => {
  try {
    if (!req.authUser) {
      res.json({
        authenticated: false,
        user: null
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.authUser.sub },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true
      }
    });

    if (!user) {
      res.json({
        authenticated: false,
        user: null
      });
      return;
    }

    const resolvedRole = await syncUserRole(user.id, user.email);

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        avatarUrl: user.image ?? null,
        role: resolvedRole
      }
    });
  } catch (error) {
    next(error);
  }
});
