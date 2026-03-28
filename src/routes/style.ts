import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/authenticate";
import { prisma } from "../lib/prisma";

const rgbColorPattern =
  /^rgb\(\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*\)$/;
const fontFamilyPattern = /^[a-zA-Z0-9\s,"'-]{1,100}$/;

const updateStyleSchema = z
  .object({
    backgroundColor: z.string().trim().regex(rgbColorPattern, "backgroundColor must use rgb(r, g, b) format").optional(),
    fontFamily: z.string().trim().regex(fontFamilyPattern, "fontFamily contains unsupported characters").optional()
  })
  .refine((payload) => payload.backgroundColor !== undefined || payload.fontFamily !== undefined, {
    message: "At least one field must be updated"
  });

const styleSelection = {
  id: true,
  backgroundColor: true,
  fontFamily: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  }
} as const;

export const styleRouter = Router();

styleRouter.get("/", async (_req, res, next) => {
  try {
    const style = await prisma.styleSetting.upsert({
      where: { id: "global" },
      update: {},
      create: {
        id: "global",
        backgroundColor: "rgb(0, 127, 255)",
        fontFamily: "Comic Sans MS"
      },
      select: styleSelection
    });

    res.json(style);
  } catch (error) {
    next(error);
  }
});

styleRouter.patch("/", requireAuth, async (req, res, next) => {
  try {
    const parsedBody = updateStyleSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        message: "Invalid style payload",
        errors: parsedBody.error.flatten()
      });
      return;
    }

    const style = await prisma.styleSetting.upsert({
      where: { id: "global" },
      update: {
        ...(parsedBody.data.backgroundColor ? { backgroundColor: parsedBody.data.backgroundColor } : {}),
        ...(parsedBody.data.fontFamily ? { fontFamily: parsedBody.data.fontFamily } : {}),
        updatedById: req.authUser!.sub
      },
      create: {
        id: "global",
        backgroundColor: parsedBody.data.backgroundColor ?? "rgb(0, 127, 255)",
        fontFamily: parsedBody.data.fontFamily ?? "Comic Sans MS",
        updatedById: req.authUser!.sub
      },
      select: styleSelection
    });

    res.json(style);
  } catch (error) {
    next(error);
  }
});
