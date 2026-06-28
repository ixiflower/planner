import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { authRouter } from "./routes/auth.js";
import { oauthRouter } from "./routes/oauth.js";
import { uploadRouter } from "./routes/upload.js";
import { tasksRouter } from "./routes/tasks.js";
import { usersRouter } from "./routes/users.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: ["http://localhost:82", "http://localhost:5173"],
  credentials: true,
}));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", service: "planner-neon" }));

// Routes
app.route("/api/auth", authRouter);
app.route("/api/auth", oauthRouter);
app.route("/api/auth", uploadRouter);
app.route("/api/tasks", tasksRouter);
app.route("/api/users", usersRouter);

// 404
app.notFound((c) => c.json({ error: "Not found" }, 404));

const port = Number(process.env.PORT) || 8002;

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 Planner API running on http://localhost:${port}`);
});
