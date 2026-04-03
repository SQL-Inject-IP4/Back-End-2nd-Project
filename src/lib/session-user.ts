import type { UserRole } from "../generated/prisma/enums.js";

export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: UserRole;
  name: string | null;
  avatarUrl: string | null;
};
