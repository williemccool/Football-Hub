import { Router } from "express";
import { randomUUID } from "node:crypto";

import { getDatabase } from "../../services/database";

const router: Router = Router();

// Create an anonymous user record. Returns an ID the client should keep.
router.post("/", async (_req, res) => {
  const id = `u_${randomUUID()}`;
  const db = getDatabase();
  const rec = await db.upsertUser(id, null, 0);
  res.status(201).json({ id: rec.id, createdAt: rec.createdAt });
});

router.get("/:id", async (req, res): Promise<void> => {
  const db = getDatabase();
  const u = await db.getUser(req.params.id);
  if (!u) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ id: u.id, createdAt: u.createdAt, updatedAt: u.updatedAt });
});

export default router;
