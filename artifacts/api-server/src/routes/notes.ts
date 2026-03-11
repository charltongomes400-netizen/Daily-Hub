import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const CreateNoteBody = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

const UpdateNoteBody = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

router.get("/", async (_req, res) => {
  const notes = await db.select().from(notesTable).orderBy(notesTable.createdAt);
  res.json(notes.map(n => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const body = CreateNoteBody.parse(req.body);
  const [note] = await db.insert(notesTable).values(body).returning();
  res.status(201).json({
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const { id } = IdParam.parse(req.params);
  const body = UpdateNoteBody.parse(req.body);
  const updates: Partial<typeof notesTable.$inferInsert> = {
    ...body,
    updatedAt: new Date(),
  };
  const [note] = await db.update(notesTable).set(updates).where(eq(notesTable.id, id)).returning();
  res.json({
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const { id } = IdParam.parse(req.params);
  await db.delete(notesTable).where(eq(notesTable.id, id));
  res.status(204).send();
});

export default router;
