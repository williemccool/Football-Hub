import { remoteApi, isRemoteConfigured } from "./remote";
import { cache } from "./cache";
import type { ObjectStorageService } from "./types";

const REPLAY_INDEX_KEY = "slashfootball.replayIndex.v1";
const REPLAY_LOCAL_PREFIX = "slashfootball.replay.";

interface IndexEntry {
  key: string;
  size: number;
  createdAt: number;
}

async function readIndex(): Promise<IndexEntry[]> {
  return (await cache.read<IndexEntry[]>(REPLAY_INDEX_KEY)) ?? [];
}
async function writeIndex(items: IndexEntry[]) {
  await cache.write(REPLAY_INDEX_KEY, items);
}

class HybridObjectStorage implements ObjectStorageService {
  async putReplay(key: string, payload: unknown) {
    // Always write local copy so highlights can be re-watched offline.
    await cache.write(REPLAY_LOCAL_PREFIX + key, payload);
    const size = JSON.stringify(payload).length;
    const idx = await readIndex();
    const filtered = idx.filter((i) => i.key !== key);
    filtered.unshift({ key, size, createdAt: Date.now() });
    await writeIndex(filtered.slice(0, 200));

    if (isRemoteConfigured()) {
      // Best-effort remote write; don't fail the user if it errors.
      try {
        await remoteApi.putReplay(key, payload);
      } catch {
        /* swallowed — sync layer can retry later */
      }
    }
    return { key, size };
  }

  async getReplay(key: string) {
    const local = await cache.read<unknown>(REPLAY_LOCAL_PREFIX + key);
    if (local) return local;
    if (!isRemoteConfigured()) return null;
    try {
      const r = await remoteApi.getReplay(key);
      // Backfill cache for next read.
      await cache.write(REPLAY_LOCAL_PREFIX + key, r.data);
      return r.data;
    } catch {
      return null;
    }
  }

  async listReplays(prefix?: string) {
    const idx = await readIndex();
    return idx
      .filter((i) => (prefix ? i.key.startsWith(prefix) : true))
      .map((i) => ({ key: i.key, size: i.size }));
  }
}

export const objectStorage: ObjectStorageService = new HybridObjectStorage();
