import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  key: string;
  windowMs: number;
  maxRequests: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, Bucket>();

export function setSecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
}

export function createRateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") {
      next();
      return;
    }

    const now = Date.now();
    const clientKey = `${options.key}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    const bucket = rateLimitStore.get(clientKey);

    if (!bucket || bucket.resetAt <= now) {
      rateLimitStore.set(clientKey, {
        count: 1,
        resetAt: now + options.windowMs
      });

      applyRateLimitHeaders(res, options.maxRequests, options.maxRequests - 1, now + options.windowMs);
      next();
      return;
    }

    bucket.count += 1;
    applyRateLimitHeaders(res, options.maxRequests, Math.max(options.maxRequests - bucket.count, 0), bucket.resetAt);

    if (bucket.count > options.maxRequests) {
      res.status(429).json({
        message: "Too many requests, please try again later"
      });
      return;
    }

    next();
  };
}

function applyRateLimitHeaders(res: Response, limit: number, remaining: number, resetAt: number) {
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
}
