import "dotenv/config";
import { z } from "zod";

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  REGISTERED_GOOGLE_ACCOUNTS: z.string().default(""),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  FRONTEND_URLS: z.string().default(""),
  FRONTEND_LOGIN_SUCCESS_URL: z.string().url().default("http://localhost:5173/"),
  FRONTEND_LOGIN_FAILURE_URL: z.string().url().default("http://localhost:5173/"),
  AUTH_USE_FRONTEND_PROXY: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  JWT_SECRET: z.string().min(32).optional()
});

const parsedEnv = envSchema.parse(process.env);
const authSecret = parsedEnv.BETTER_AUTH_SECRET ?? parsedEnv.JWT_SECRET;

if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET or JWT_SECRET must be set with at least 32 characters");
}

export const env = {
  ...parsedEnv,
  AUTH_SECRET: authSecret,
  AUTH_USE_FRONTEND_PROXY: parseBoolean(parsedEnv.AUTH_USE_FRONTEND_PROXY),
  BACKEND_ORIGIN: new URL(parsedEnv.GOOGLE_CALLBACK_URL).origin,
  REGISTERED_GOOGLE_ACCOUNTS: parsedEnv.REGISTERED_GOOGLE_ACCOUNTS.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean),
  FRONTEND_URLS: parsedEnv.FRONTEND_URLS.split(",")
    .map((url) => url.trim())
    .filter(Boolean)
};
