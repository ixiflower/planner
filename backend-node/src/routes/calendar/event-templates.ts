import "dotenv/config";
import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { eventTemplates } from "../../db/schema/index.js";
import { authMiddleware } from "../../middleware/auth.js";

export const eventTemplatesRouter = new Hono();
eventTemplatesRouter.use("*", authMiddleware);

// GET /event-templates
eventTemplatesRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const templates = await db
    .select()
    .from(eventTemplates)
    .where(eq(eventTemplates.userId, user.id));

  return c.json(templates);
});

// POST /event-templates
eventTemplatesRouter.post("/", async (c) => {
  const user = c.get("user")!;
  const { name, title, color, category } = await c.req.json();

  const [template] = await db
    .insert(eventTemplates)
    .values({ userId: user.id, name, title, color, category })
    .returning();

  return c.json(template, 201);
});

// PUT /event-templates/:id
eventTemplatesRouter.put("/:id", async (c) => {
  const user = c.get("user")!;
  const id = parseInt(c.req.param("id"), 10);
  const { name, title, color, category } = await c.req.json();

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (title !== undefined) updates.title = title;
  if (color !== undefined) updates.color = color;
  if (category !== undefined) updates.category = category;

  const [template] = await db
    .update(eventTemplates)
    .set(updates)
    .where(and(eq(eventTemplates.id, id), eq(eventTemplates.userId, user.id)))
    .returning();

  if (!template) return c.json({ error: "Template not found" }, 404);
  return c.json(template);
});

// DELETE /event-templates/:id
eventTemplatesRouter.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = parseInt(c.req.param("id"), 10);

  const [template] = await db
    .delete(eventTemplates)
    .where(and(eq(eventTemplates.id, id), eq(eventTemplates.userId, user.id)))
    .returning();

  if (!template) return c.json({ error: "Template not found" }, 404);
  return c.json({ success: true });
});
