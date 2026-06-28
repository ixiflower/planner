import "dotenv/config";
import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { permanentNotes } from "../../db/schema/index.js";
import { authMiddleware } from "../../middleware/auth.js";

export const notesRouter = new Hono();
notesRouter.use("*", authMiddleware);

// GET /notes - list notes
notesRouter.get("/", async (c) => {
  const user = c.get("user")!;
  const notes = await db
    .select()
    .from(permanentNotes)
    .where(eq(permanentNotes.userId, user.id))
    .orderBy(desc(permanentNotes.updatedAt));

  return c.json({ notes: notes.map(mapNote) });
});

// POST /notes - create note
notesRouter.post("/", async (c) => {
  const user = c.get("user")!;
  const { title, content } = await c.req.json();

  if (!content) {
    return c.json({ error: "content is required" }, 400);
  }

  const [note] = await db
    .insert(permanentNotes)
    .values({ userId: user.id, title: title || "", content })
    .returning();

  return c.json(mapNote(note), 201);
});

// PUT /notes/:id - update note
notesRouter.put("/:id", async (c) => {
  const user = c.get("user")!;
  const id = parseInt(c.req.param("id"), 10);
  const { title, content } = await c.req.json();

  const [note] = await db
    .update(permanentNotes)
    .set({ title, content, updatedAt: new Date() })
    .where(and(eq(permanentNotes.id, id), eq(permanentNotes.userId, user.id)))
    .returning();

  if (!note) return c.json({ error: "Note not found" }, 404);
  return c.json(mapNote(note));
});

// DELETE /notes/:id - delete note
notesRouter.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = parseInt(c.req.param("id"), 10);

  const [note] = await db
    .delete(permanentNotes)
    .where(and(eq(permanentNotes.id, id), eq(permanentNotes.userId, user.id)))
    .returning();

  if (!note) return c.json({ error: "Note not found" }, 404);
  return c.json({ success: true });
});

function mapNote(n: any) {
  return {
    id: n.id,
    title: n.title || "",
    content: n.content || "",
    created_at: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
    updated_at: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt,
  };
}
