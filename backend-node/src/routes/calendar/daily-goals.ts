import "dotenv/config";
import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { dailyGoals } from "../../db/schema/index.js";
import { authMiddleware } from "../../middleware/auth.js";

export const dailyGoalsRouter = new Hono();
dailyGoalsRouter.use("*", authMiddleware);

// GET /daily-goals
dailyGoalsRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const goals = await db
    .select()
    .from(dailyGoals)
    .where(eq(dailyGoals.userId, user.id))
    .orderBy(desc(dailyGoals.date));

  return c.json(goals.map(mapGoal));
});

// POST /daily-goals
dailyGoalsRouter.post("/", async (c) => {
  const user = c.get("user")!;
  const { text, completed, date, priority, category, color, notes, targetTime } = await c.req.json();

  if (!text) return c.json({ error: "text is required" }, 400);

  const [goal] = await db
    .insert(dailyGoals)
    .values({
      userId: user.id,
      text,
      completed: Boolean(completed),
      date: date ? new Date(date) : new Date(),
      priority: priority !== undefined ? Number(priority) : 0,
      category: category || null,
      color: color || null,
      notes: notes || null,
      targetTime: targetTime ? String(targetTime) : null,
    })
    .returning();

  return c.json(mapGoal(goal), 201);
});

// PUT /daily-goals/:id
dailyGoalsRouter.put("/:id", async (c) => {
  const user = c.get("user")!;
  const id = parseInt(c.req.param("id"), 10);
  const { text, completed, date, priority, category, color, notes, targetTime } = await c.req.json();

  const updates: Record<string, any> = {};
  if (text !== undefined) updates.text = text;
  if (completed !== undefined) updates.completed = Boolean(completed);
  if (date !== undefined) updates.date = new Date(date);
  if (priority !== undefined) updates.priority = Number(priority);
  if (category !== undefined) updates.category = category;
  if (color !== undefined) updates.color = color;
  if (notes !== undefined) updates.notes = notes;
  if (targetTime !== undefined) updates.targetTime = String(targetTime);

  const [goal] = await db
    .update(dailyGoals)
    .set(updates)
    .where(and(eq(dailyGoals.id, id), eq(dailyGoals.userId, user.id)))
    .returning();

  if (!goal) return c.json({ error: "Daily goal not found" }, 404);
  return c.json(mapGoal(goal));
});

// DELETE /daily-goals/:id
dailyGoalsRouter.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = parseInt(c.req.param("id"), 10);

  const [goal] = await db
    .delete(dailyGoals)
    .where(and(eq(dailyGoals.id, id), eq(dailyGoals.userId, user.id)))
    .returning();

  if (!goal) return c.json({ error: "Daily goal not found" }, 404);
  return c.json({ success: true });
});

function mapGoal(g: any) {
  return {
    id: g.id,
    text: g.text,
    completed: Boolean(g.completed),
    date: g.date instanceof Date ? g.date.toISOString() : g.date,
    priority: g.priority,
    category: g.category,
    color: g.color,
    notes: g.notes,
    targetTime: g.targetTime ? Number(g.targetTime) : null,
  };
}
