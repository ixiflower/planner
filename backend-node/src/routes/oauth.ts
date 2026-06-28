import "dotenv/config";
import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { generateToken } from "../middleware/auth.js";

export const oauthRouter = new Hono();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:8002/api/auth/google/callback";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || "http://localhost:8002/api/auth/github/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:82";

// ─── Google OAuth ───

// Step 1: Redirect to Google consent screen
oauthRouter.get("/google", (c) => {
  if (!GOOGLE_CLIENT_ID) {
    return c.redirect(`${FRONTEND_URL}/auth?error=google_not_configured`);
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "consent",
  });

  // Store state for verification (in memory is fine for single-instance)
  // For production, use a proper session store
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return c.redirect(url);
});

// Step 2: Handle Google callback
oauthRouter.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error || !code) {
    return c.redirect(`${FRONTEND_URL}/auth?error=oauth_denied`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return c.redirect(`${FRONTEND_URL}/auth?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get user info from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      return c.redirect(`${FRONTEND_URL}/auth?error=userinfo_failed`);
    }

    const googleUser = await userInfoResponse.json();
    const googleId = String(googleUser.id);
    const email = googleUser.email;
    const name = googleUser.name || email.split("@")[0];
    const picture = googleUser.picture;

    // Find or create user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    let user;
    if (existingUser) {
      // Update Google info
      [user] = await db
        .update(users)
        .set({
          profilePicture: existingUser.profilePicture || picture,
          lastName: existingUser.lastName || name,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
    } else {
      // Create new user
      const username = email.split("@")[0] + "_" + Math.random().toString(36).slice(2, 6);
      const tempPassword = await bcrypt.hash(crypto.randomUUID(), 10);
      const [first, ...rest] = name.split(" ");

      [user] = await db
        .insert(users)
        .values({
          username,
          email,
          password: tempPassword,
          firstName: first || "",
          lastName: rest.join(" ") || "",
          profilePicture: picture,
          isActive: true,
          teamRole: "None",
        })
        .returning();
    }

    // Generate our JWT
    const token = await generateToken(user);

    // Redirect back to frontend with token
    return c.redirect(`${FRONTEND_URL}/auth?token=${token}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return c.redirect(`${FRONTEND_URL}/auth?error=oauth_failed`);
  }
});

// ─── GitHub OAuth ───

oauthRouter.get("/github", (c) => {
  if (!GITHUB_CLIENT_ID) {
    return c.redirect(`${FRONTEND_URL}/auth?error=github_not_configured`);
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "read:user user:email",
    state,
  });

  const url = `https://github.com/login/oauth/authorize?${params}`;
  return c.redirect(url);
});

oauthRouter.get("/github/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");

  if (error || !code) {
    return c.redirect(`${FRONTEND_URL}/auth?error=oauth_denied`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      return c.redirect(`${FRONTEND_URL}/auth?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from GitHub
    const userInfoResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      return c.redirect(`${FRONTEND_URL}/auth?error=userinfo_failed`);
    }

    const githubUser = await userInfoResponse.json();
    const githubId = String(githubUser.id);
    let email = githubUser.email;

    // If email is null on GitHub, fetch emails separately
    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primary = emails.find((e: any) => e.primary && e.verified);
        email = primary?.email || emails[0]?.email || `${githubUser.login}@github.com`;
      }
    }

    const name = githubUser.name || githubUser.login;
    const picture = githubUser.avatar_url;

    // Find or create user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    let user;
    if (existingUser) {
      [user] = await db
        .update(users)
        .set({
          profilePicture: existingUser.profilePicture || picture,
          lastName: existingUser.lastName || name,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
    } else {
      const username = email.split("@")[0] + "_" + Math.random().toString(36).slice(2, 6);
      const tempPassword = await bcrypt.hash(crypto.randomUUID(), 10);
      const [first, ...rest] = name.split(" ");

      [user] = await db
        .insert(users)
        .values({
          username,
          email,
          password: tempPassword,
          firstName: first || "",
          lastName: rest.join(" ") || "",
          profilePicture: picture,
          isActive: true,
          teamRole: "None",
        })
        .returning();
    }

    const token = await generateToken(user);
    return c.redirect(`${FRONTEND_URL}/auth?token=${token}`);
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    return c.redirect(`${FRONTEND_URL}/auth?error=oauth_failed`);
  }
});
