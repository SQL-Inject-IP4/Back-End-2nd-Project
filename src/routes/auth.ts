import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "../config/env";
import type { User } from "../generated/prisma/client";
import { AUTH_COOKIE_NAME, getAuthCookieOptions, resolveUserRole, signAuthToken } from "../lib/auth";
import { prisma } from "../lib/prisma";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const primaryEmail = profile.emails?.[0]?.value?.trim().toLowerCase();

        if (!primaryEmail) {
          done(new Error("Google account does not expose an email address"));
          return;
        }

        const user = await prisma.user.upsert({
          where: { email: primaryEmail },
          update: {
            googleId: profile.id,
            name: profile.displayName || primaryEmail,
            avatarUrl: profile.photos?.[0]?.value ?? null,
            role: resolveUserRole(primaryEmail)
          },
          create: {
            email: primaryEmail,
            googleId: profile.id,
            name: profile.displayName || primaryEmail,
            avatarUrl: profile.photos?.[0]?.value ?? null,
            role: resolveUserRole(primaryEmail)
          }
        });

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

export const authRouter = Router();

authRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: env.FRONTEND_LOGIN_FAILURE_URL
  }),
  (req, res) => {
    const user = req.user as User;

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    res.redirect(env.FRONTEND_LOGIN_SUCCESS_URL);
  }
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.status(204).send();
});

authRouter.get("/me", async (req, res, next) => {
  try {
    if (!req.authUser) {
      res.json({
        authenticated: false,
        user: null
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.authUser.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
      res.json({
        authenticated: false,
        user: null
      });
      return;
    }

    res.json({
      authenticated: true,
      user
    });
  } catch (error) {
    next(error);
  }
});
