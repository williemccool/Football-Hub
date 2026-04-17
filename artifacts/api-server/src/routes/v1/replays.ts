import { Router } from "express";

import { getObjectStorage } from "../../services/objectStorage";

const router: Router = Router();

router.get("/:key", async (req, res): Promise<void> => {
  const storage = getObjectStorage();
  const obj = await storage.get(req.params.key);
  if (!obj) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ key: obj.key, data: obj.data, createdAt: obj.createdAt });
});

router.put("/:key", async (req, res): Promise<void> => {
  const storage = getObjectStorage();
  const { data } = req.body ?? {};
  if (data === undefined) {
    res.status(400).json({ error: "missing_data" });
    return;
  }
  const obj = await storage.put(req.params.key, data);
  res.json({ key: obj.key, size: obj.size, createdAt: obj.createdAt });
});

router.get("/", async (req, res) => {
  const storage = getObjectStorage();
  const prefix = (req.query.prefix as string) || undefined;
  const items = await storage.list(prefix);
  res.json({ items });
});

router.delete("/:key", async (req, res) => {
  const storage = getObjectStorage();
  await storage.delete(req.params.key);
  res.json({ ok: true });
});

export default router;
