import "dotenv/config";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { eq, or, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { generateToken, authMiddleware } from "../middleware/auth.js";
import { sendOtpEmail, generateOtp } from "../utils/email.js";

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

  // Check email verification
  if (!user.emailVerified) {
    // Generate a new OTP and send it
    const otp = generateOtp();
    const hashed = await bcrypt.hash(otp, 10);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db
      .update(users)
      .set({ emailOtp: hashed, emailOtpExpires: expires })
      .where(eq(users.id, user.id));

    // Try to send OTP (fire-and-forget)
    sendOtpEmail(user.email, otp).catch((err) =>
      console.error("Failed to send OTP:", err)
    );

    return c.json({
      error: "Email not verified",
      needsVerification: true,
      email: user.email,
    }, 403);
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
      emailVerified: false,
    })
    .returning();

  // Generate and send OTP
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db
    .update(users)
    .set({ emailOtp: otpHash, emailOtpExpires: expires })
    .where(eq(users.id, newUser.id));

  // Send OTP email (fire-and-forget -- don't block registration)
  sendOtpEmail(email, otp).catch((err) => {
    console.error("Failed to send OTP email:", err.message);
    // Log OTP to console when SMTP is not configured (dev mode)
    if (!process.env.SMTP_USER) {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    }
  });

  return c.json({
    success: true,
    message: "Verification code sent to your email",
    needsVerification: true,
    email,
  });
});

// ─── Verify Email (OTP) ───
const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

authRouter.post("/verify-email", zValidator("json", verifySchema), async (c) => {
  const { email, otp } = c.req.valid("json");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  if (user.emailVerified) {
    return c.json({ error: "Email already verified" }, 400);
  }

  if (!user.emailOtp || !user.emailOtpExpires) {
    return c.json({ error: "No verification code found. Please register again." }, 400);
  }

  // Check expiry
  if (new Date() > user.emailOtpExpires) {
    return c.json({ error: "Verification code has expired. Please request a new one.", expired: true }, 400);
  }

  // Verify OTP
  const valid = await bcrypt.compare(otp, user.emailOtp);
  if (!valid) {
    return c.json({ error: "Invalid verification code" }, 400);
  }

  // Mark as verified and clear OTP
  await db
    .update(users)
    .set({
      emailVerified: true,
      emailOtp: null,
      emailOtpExpires: null,
    })
    .where(eq(users.id, user.id));

  // Generate auth token
  user.emailVerified = true;
  const token = await generateToken(user);

  return c.json({
    success: true,
    message: "Email verified successfully",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
      profile_picture: user.profilePicture,
      team_role: user.teamRole,
    },
  });
});

// ─── Resend OTP ───
const resendSchema = z.object({
  email: z.string().email(),
});

authRouter.post("/resend-otp", zValidator("json", resendSchema), async (c) => {
  const { email } = c.req.valid("json");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  if (user.emailVerified) {
    return c.json({ error: "Email already verified" }, 400);
  }

  // Generate new OTP
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .update(users)
    .set({ emailOtp: otpHash, emailOtpExpires: expires })
    .where(eq(users.id, user.id));

  // Send OTP email
  sendOtpEmail(email, otp).catch((err) =>
    console.error("Failed to send OTP:", err)
  );

  return c.json({
    success: true,
    message: "New verification code sent to your email",
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
      email_verified: user.emailVerified,
    },
  });
});
