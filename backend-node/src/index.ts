import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { authRouter } from "./routes/auth.js";
import { oauthRouter } from "./routes/oauth.js";
import { uploadRouter } from "./routes/upload.js";
import { calendarEventsRouter } from "./routes/calendar/events.js";
import { notesRouter } from "./routes/calendar/notes.js";
import { dailyGoalsRouter } from "./routes/calendar/daily-goals.js";
import { eventTemplatesRouter } from "./routes/calendar/event-templates.js";
import { exerciseRouter } from "./routes/calendar/exercise.js";
import { usersRouter } from "./routes/users.js";

const app = new Hono();

// CORS
app.use("*", cors({
  origin: ["http://localhost:82", "http://localhost:8002"],
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Health
app.get("/api/health", (c) => c.json({ status: "ok", service: "planner-neon" }));

// Routes
app.route("/api/auth", authRouter);
app.route("/api/auth", oauthRouter);
app.route("/api/auth", uploadRouter);
app.route("/api/tasks", calendarEventsRouter);
app.route("/api/notes", notesRouter);
app.route("/api/daily-goals", dailyGoalsRouter);
app.route("/api/event-templates", eventTemplatesRouter);
app.route("/api/exercise", exerciseRouter);
app.route("/api/users", usersRouter);

// Start
const port = Number(process.env.PORT) || 8002;
console.log(`🚀 Planner API running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
