import "dotenv/config";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { generateToken, authMiddleware } from "../middleware/auth.js";

export const authRouter = new Hono();

// ─── Login ───
const loginSchema = z.object({
  email: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1),
});

authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, username, password } = c.req.valid("json");

  if (!email && !username) {
    return c.json({ error: "Email or username is required" }, 400);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(email ? eq(users.email, email) : eq(users.username, username!));

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await generateToken(user);

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
      profile_picture: user.profilePicture,
      team_role: user.teamRole,
      developer: user.developer,
      is_admin: user.isStaff || user.isSuperuser,
      is_superuser: user.isSuperuser,
    },
  });
});

// ─── Register ───
const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  password2: z.string().optional(),
});

authRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  const { name, email, username, password, password2 } = c.req.valid("json");

  if (password2 && password !== password2) {
    return c.json({ error: "Passwords do not match" }, 400);
  }

  // Check existing
  const [existing] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)));

  if (existing) {
    const field = existing.email === email ? "Email" : "Username";
    return c.json({ error: `${field} already exists` }, 400);
  }

  const hashed = await bcrypt.hash(password, 10);
  const fullName = (name || "").trim();
  const [first, ...rest] = fullName.split(" ");

  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email,
      password: hashed,
      firstName: first || "",
      lastName: rest.join(" ") || "",
      isActive: true,
      teamRole: "None",
    })
    .returning();

  const token = await generateToken(newUser);

  return c.json({
    success: true,
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: fullName || newUser.username,
      team_role: newUser.teamRole,
      developer: newUser.developer,
      is_admin: false,
      is_superuser: false,
    },
  });
});

// ─── Get current user (protected) ───
authRouter.get("/me", authMiddleware, async (c) => {
  const user = c.get("user")!;
  return c.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
      profile_picture: user.profilePicture,
      team_role: user.teamRole,
      telegram_id: user.telegramId,
      developer: user.developer,
      is_admin: user.isStaff || user.isSuperuser,
      is_superuser: user.isSuperuser,
      is_staff: user.isStaff,
      can_see_work_hours: user.canSeeWorkHours,
      bio: user.bio,
      notepad_content: user.notepadContent,
    },
  });
});
