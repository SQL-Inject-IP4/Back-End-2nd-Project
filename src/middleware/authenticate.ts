import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "../lib/auth";
import { prisma } from "../lib/prisma";

export async function attachAuthUser(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    req.authUser = null;
    next();
    return;
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
    req.authUser = null;
    next();
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
      req.authUser = null;
      next();
      return;
    }

    const allowedAccount = await prisma.allowedGoogleAccount.findUnique({
      where: { email: user.email },
      select: {
        role: true,
        isActive: true
      }
    });

    const resolvedRole =
      allowedAccount && allowedAccount.isActive
        ? allowedAccount.role
        : "VIEWER";

    if (user.role !== resolvedRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: resolvedRole
        }
      });
    }

    req.authUser = {
      sub: user.id,
      email: user.email,
      name: user.name,
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
