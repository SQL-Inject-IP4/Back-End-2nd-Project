import type { AuthTokenPayload } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthTokenPayload | null;
    }
  }
}

export {};
