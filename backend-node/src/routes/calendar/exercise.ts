import "dotenv/config";
import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { exercises } from "../../db/schema/index.js";
import { authMiddleware } from "../../middleware/auth.js";

export const exerciseRouter = new Hono();
exerciseRouter.use("*", authMiddleware);

// GET /exercise - get user's exercise
exerciseRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const [exercise] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.userId, user.id))
    .limit(1);

  if (!exercise) return c.json({ exercise: null });
  return c.json({ exercise: { id: exercise.id, content: exercise.content } });
});

// POST /exercise - save exercise
exerciseRouter.post("/", async (c) => {
  const user = c.get("user")!;
  const { content } = await c.req.json();

  if (!content) return c.json({ error: "content is required" }, 400);

  // Upsert: check if user already has an exercise
  const [existing] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.userId, user.id))
    .limit(1);

  let result;
  if (existing) {
    [result] = await db
      .update(exercises)
      .set({ content })
      .where(eq(exercises.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(exercises)
      .values({ userId: user.id, content })
      .returning();
  }

  return c.json({ exercise: { id: result.id, content: result.content } });
});
