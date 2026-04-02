import type { AuthenticatedUser } from "../lib/session-user.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser | null;
    }
  }
}

export {};
