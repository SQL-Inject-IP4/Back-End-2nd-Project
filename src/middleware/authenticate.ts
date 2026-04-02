import type { NextFunction, Request, Response } from "express";
import { getSessionFromRequest } from "../lib/better-auth.js";
import { syncUserRole } from "../lib/rbac.js";

export async function attachAuthUser(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await getSessionFromRequest(req);

    if (!session) {
      req.authUser = null;
      next();
      return;
    }

    const resolvedRole = await syncUserRole(session.user.id, session.user.email);

    req.authUser = {
      sub: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      role: resolvedRole
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  next();
}

export function requireEditor(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.authUser.role !== "EDITOR") {
    res.status(403).json({ message: "Your registered role does not allow style changes" });
    return;
  }

  next();
}
