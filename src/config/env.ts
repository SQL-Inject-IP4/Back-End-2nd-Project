import "dotenv/config";
import { z } from "zod";

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
  FRONTEND_LOGIN_FAILURE_URL: z.string().url().default("http://localhost:5173/login-failed"),
  JWT_SECRET: z.string().min(32)
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  REGISTERED_GOOGLE_ACCOUNTS: parsedEnv.REGISTERED_GOOGLE_ACCOUNTS.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean),
  FRONTEND_URLS: parsedEnv.FRONTEND_URLS.split(",")
    .map((url) => url.trim())
    .filter(Boolean)
};
