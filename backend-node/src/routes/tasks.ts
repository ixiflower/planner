import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";

export const tasksRouter = new Hono();

tasksRouter.use("*", authMiddleware);

tasksRouter.get("/", (c) => {
  return c.json({ tasks: [], message: "Tasks API - coming soon" });
});
