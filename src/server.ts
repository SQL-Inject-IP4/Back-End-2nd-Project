import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { betterAuthHandler } from "./lib/better-auth.js";
import { attachAuthUser } from "./middleware/authenticate.js";
import { setSecurityHeaders } from "./middleware/security.js";
import { authRouter } from "./routes/auth.js";
import { styleRouter } from "./routes/style.js";

const app = express();
app.disable("x-powered-by");
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
app.use(setSecurityHeaders);
app.all(/^\/api\/auth(?:\/.*)?$/, (req, res) => betterAuthHandler(req, res));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use(attachAuthUser);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/api/style", styleRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      message: "Malformed JSON payload"
    });
    return;
  }

  if (error instanceof Error && error.message === "Origin not allowed by CORS") {
    res.status(403).json({
      message: "Origin not allowed"
    });
    return;
  }

  console.error(error instanceof Error ? error.message : error);
  res.status(500).json({
    message: "Internal server error"
  });
});

app.listen(env.PORT, () => {
  console.log(`Backend server listening on http://localhost:${env.PORT}`);
});
