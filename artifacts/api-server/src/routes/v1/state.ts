import { Router } from "express";

import { getDatabase } from "../../services/database";

const router: Router = Router();

// Pull canonical state for a user.
router.get("/:userId", async (req, res): Promise<void> => {
  const db = getDatabase();
  const u = await db.getUser(req.params.userId);
  if (!u) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({
    userId: u.id,
    state: u.state,
    stateVersion: u.stateVersion,
    updatedAt: u.updatedAt,
  });
});

// Push canonical state. Server-authoritative conflict resolution: the
// client must send `baseVersion`; if it does not match, server rejects.
router.put("/:userId", async (req, res): Promise<void> => {
  const db = getDatabase();
  const { state, baseVersion } = req.body ?? {};
  if (state === undefined) {
    res.status(400).json({ error: "missing_state" });
    return;
  }

  const existing = await db.getUser(req.params.userId);
  if (!existing) {
    const rec = await db.upsertUser(req.params.userId, state, 1);
    res.json({
      userId: rec.id,
      stateVersion: rec.stateVersion,
      updatedAt: rec.updatedAt,
    });
    return;
  }
  // Strict: every push to an existing record must include baseVersion and
  // it must match the server's current version. This is the core of
  // server-authoritative conflict resolution.
  if (typeof baseVersion !== "number") {
    res.status(400).json({ error: "missing_base_version" });
    return;
  }
  if (baseVersion !== existing.stateVersion) {
    res.status(409).json({
      error: "version_conflict",
      serverVersion: existing.stateVersion,
    });
    return;
  }
  const rec = await db.upsertUser(
    req.params.userId,
    state,
    existing.stateVersion + 1,
  );
  res.json({
    userId: rec.id,
    stateVersion: rec.stateVersion,
    updatedAt: rec.updatedAt,
  });
});

export default router;
