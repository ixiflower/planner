import "dotenv/config";
import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { calendarEvents } from "../../db/schema/index.js";
import { authMiddleware } from "../../middleware/auth.js";

export const calendarEventsRouter = new Hono();
calendarEventsRouter.use("*", authMiddleware);

// GET /tasks - list all events for current user
calendarEventsRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const events = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.userId, user.id))
    .orderBy(desc(calendarEvents.startDate));

  return c.json({ tasks: events.map(mapEvent) });
});

// POST /tasks - create event
calendarEventsRouter.post("/", async (c) => {
  const user = c.get("user")!;
  const { title, description, start_date, end_date, color, is_important, category } = await c.req.json();

  if (!title || !start_date || !end_date) {
    return c.json({ error: "title, start_date, and end_date are required" }, 400);
  }

  const [event] = await db
    .insert(calendarEvents)
    .values({
      userId: user.id,
      title,
      description: description || "",
      startDate: new Date(start_date),
      endDate: new Date(end_date),
      color: color || "blue",
      isImportant: Boolean(is_important),
      category: category || "general",
    })
    .returning();

  return c.json(mapEvent(event), 201);
});

// PUT /tasks/:id - update event
calendarEventsRouter.put("/:id", async (c) => {
  const user = c.get("user")!;
  const id = parseInt(c.req.param("id"), 10);
  const { title, description, start_date, end_date, color, is_important, category } = await c.req.json();

  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (start_date !== undefined) updates.startDate = new Date(start_date);
  if (end_date !== undefined) updates.endDate = new Date(end_date);
  if (color !== undefined) updates.color = color;
  if (is_important !== undefined) updates.isImportant = Boolean(is_important);
  if (category !== undefined) updates.category = category;

  const [event] = await db
    .update(calendarEvents)
    .set(updates)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, user.id)))
    .returning();

  if (!event) return c.json({ error: "Event not found" }, 404);
  return c.json(mapEvent(event));
});

// DELETE /tasks/:id - delete event
calendarEventsRouter.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = parseInt(c.req.param("id"), 10);

  const [event] = await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, user.id)))
    .returning();

  if (!event) return c.json({ error: "Event not found" }, 404);
  return c.json({ success: true });
});

function mapEvent(e: any) {
  return {
    id: String(e.id),
    title: e.title,
    description: e.description || "",
    startDate: e.startDate instanceof Date ? e.startDate.toISOString() : e.startDate,
    endDate: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate,
    color: e.color || "blue",
    isImportant: Boolean(e.isImportant),
    category: e.category || "general",
  };
}
