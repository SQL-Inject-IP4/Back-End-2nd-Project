import type { UserRole } from "../generated/prisma/enums.js";
import { prisma } from "./prisma.js";

export async function resolveRegisteredRole(email: string): Promise<UserRole> {
  const normalizedEmail = email.trim().toLowerCase();
  const allowedAccount = await prisma.allowedGoogleAccount.findUnique({
    where: { email: normalizedEmail },
    select: {
      role: true,
      isActive: true
    }
  });

  if (!allowedAccount || !allowedAccount.isActive) {
    return "VIEWER";
  }

  return allowedAccount.role;
}

export async function syncUserRole(userId: string, email: string): Promise<UserRole> {
  const resolvedRole = await resolveRegisteredRole(email);

  await prisma.user.updateMany({
    where: {
      id: userId,
      role: {
        not: resolvedRole
      }
    },
    data: {
      role: resolvedRole
    }
  });

  return resolvedRole;
}
