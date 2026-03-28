import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "../lib/auth";

export function attachAuthUser(req: Request, res: Response, next: NextFunction) {
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

  req.authUser = payload;
  next();
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
    res.status(403).json({ message: "Only authenticated Google users can change the website style" });
    return;
  }

  next();
}
