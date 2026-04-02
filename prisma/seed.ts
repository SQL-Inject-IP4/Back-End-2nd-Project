import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type UserRole } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!
});

const prisma = new PrismaClient({ adapter });

function parseRegisteredAccounts(rawAccounts: string | undefined) {
  return (rawAccounts ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [emailPart, rolePart] = entry.split(":");
      const email = emailPart?.trim().toLowerCase();
      const role = (rolePart?.trim().toUpperCase() || "VIEWER") as UserRole;

      if (!email) {
        throw new Error(`Invalid REGISTERED_GOOGLE_ACCOUNTS entry: "${entry}"`);
      }

      if (role !== "EDITOR" && role !== "VIEWER") {
        throw new Error(`Invalid role in REGISTERED_GOOGLE_ACCOUNTS entry: "${entry}"`);
      }

      return { email, role };
    });
}

async function main() {
  const registeredAccounts = parseRegisteredAccounts(process.env.REGISTERED_GOOGLE_ACCOUNTS);

  await prisma.styleSetting.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      backgroundColor: "rgb(0, 127, 255)",
      fontFamily: "Comic Sans MS"
    }
  });

  await prisma.allowedGoogleAccount.updateMany({
    where: {
      email: {
        notIn: registeredAccounts.map((account) => account.email)
      }
    },
    data: {
      isActive: false
    }
  });

  for (const account of registeredAccounts) {
    await prisma.allowedGoogleAccount.upsert({
      where: { email: account.email },
      update: {
        role: account.role,
        isActive: true
      },
      create: {
        email: account.email,
        role: account.role,
        isActive: true
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Failed to seed database", error);
    await prisma.$disconnect();
    process.exit(1);
  });
