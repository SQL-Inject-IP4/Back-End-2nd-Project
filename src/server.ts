import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import { env } from "./config/env";
import { attachAuthUser } from "./middleware/authenticate";
import { authRouter } from "./routes/auth";
import { styleRouter } from "./routes/style";

const app = express();
const allowedOrigins = new Set(
  [env.FRONTEND_URL, ...env.FRONTEND_URLS]
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean)
);

function normalizeOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    return origin.replace(/\/+$/, "");
  }
}

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (allowedOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(attachAuthUser);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/api/style", styleRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({
    message: "Internal server error"
  });
});

app.listen(env.PORT, () => {
  console.log(`Backend server listening on http://localhost:${env.PORT}`);
});
