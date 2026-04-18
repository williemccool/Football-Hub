/**
 * Sync service: orchestrates the canonical-state lifecycle across the
 * portable database and the local cache.
 *
 *   boot()        -> ensure userId exists, pull canonical state if any,
 *                    migrate legacy local-only state on first run
 *   loadInitial() -> returns the GameState the app should start from
 *                    (server > cache > fresh)
 *   push(state)   -> debounced, queued, retried push to the backend
 *
 * Local cache is the offline fallback. When the backend is unreachable
 * or unconfigured, the app keeps working and queues a push for later.
 */

import { analytics } from "./analytics";
import { auth } from "./auth";
import { cache } from "./cache";
import { database } from "./database";
import { isRemoteConfigured } from "./remote";
import { errorLogging } from "./errorLogging";
import type { SyncSnapshot, SyncStatus } from "./types";
import type { GameState } from "@/lib/types";

const LOCAL_STATE_KEY = "slashfootball.canonical.v1";
const LEGACY_STATE_KEY = "slashfootball.state.v2";
const META_KEY = "slashfootball.syncMeta.v1";
const PENDING_KEY = "slashfootball.pendingPush.v1";

interface SyncMeta {
  stateVersion: number;
  lastSyncAt: number | null;
  migrationCompleted: boolean;
  migrationFromLegacy: boolean;
}

const DEFAULT_META: SyncMeta = {
  stateVersion: 0,
  lastSyncAt: null,
  migrationCompleted: false,
  migrationFromLegacy: false,
};

async function readMeta(): Promise<SyncMeta> {
  return (await cache.read<SyncMeta>(META_KEY)) ?? { ...DEFAULT_META };
}
async function writeMeta(m: SyncMeta) {
  await cache.write(META_KEY, m);
}

type Listener = (s: SyncSnapshot) => void;

class SyncService {
  private status: SyncStatus = "idle";
  private userId: string | null = null;
  private meta: SyncMeta = { ...DEFAULT_META };
  private lastError: string | null = null;
  private pendingState: GameState | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private listeners = new Set<Listener>();
  private serverState: GameState | null = null;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): SyncSnapshot {
    return {
      status: this.status,
      userId: this.userId,
      stateVersion: this.meta.stateVersion,
      lastSyncAt: this.meta.lastSyncAt,
      lastError: this.lastError,
      pendingActions: this.pendingState ? 1 : 0,
      migrationCompleted: this.meta.migrationCompleted,
      serverState: this.serverState,
    };
  }

  /** Consume any server-authoritative state pulled after a conflict. */
  consumeServerState(): GameState | null {
    const s = this.serverState;
    this.serverState = null;
    return s;
  }

  private emit() {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }

  private setStatus(s: SyncStatus, err: string | null = null) {
    this.status = s;
    this.lastError = err;
    this.emit();
  }

  /**
   * Prepares the app on launch. Returns the GameState to hydrate, or null
   * to use defaults.
   */
  async loadInitial(): Promise<GameState | null> {
    this.setStatus("loading");
    try {
      this.userId = await auth.getOrCreateUserId();
      this.meta = await readMeta();

      // 1) Try remote (canonical source of truth).
      if (isRemoteConfigured()) {
        this.setStatus("syncing");
        try {
          const remote = await database.pullState(this.userId);
          if (remote && remote.state) {
            this.meta.stateVersion = remote.stateVersion;
            this.meta.lastSyncAt = Date.now();
            await writeMeta(this.meta);
            await cache.write(LOCAL_STATE_KEY, remote.state);
            this.setStatus("online");
            return remote.state;
          }
        } catch (e) {
          errorLogging.capture(e, { phase: "pullState" });
          analytics.track("sync_failed", {
            phase: "initial_pull",
            error: e instanceof Error ? e.message : String(e),
          });
          analytics.track("offline_mode_used");
          // fall through to local
        }
      }

      // 2) Local canonical cache.
      const cached = await cache.read<GameState>(LOCAL_STATE_KEY);
      if (cached) {
        this.setStatus(isRemoteConfigured() ? "offline" : "online");
        return cached;
      }

      // 3) Legacy AsyncStorage state -> migrate.
      const legacy = await cache.read<GameState>(LEGACY_STATE_KEY);
      if (legacy) {
        this.setStatus("migrating");
        try {
          await cache.write(LOCAL_STATE_KEY, legacy);
          this.meta = {
            ...this.meta,
            migrationCompleted: true,
            migrationFromLegacy: true,
          };
          await writeMeta(this.meta);
          // Schedule a push so the migrated state lands on the backend.
          this.queuePush(legacy);
          analytics.track("migration_succeeded", { fromLegacy: true });
          this.setStatus(isRemoteConfigured() ? "syncing" : "online");
          return legacy;
        } catch (mErr) {
          analytics.track("migration_failed", {
            error: mErr instanceof Error ? mErr.message : String(mErr),
          });
          errorLogging.capture(mErr, { phase: "legacyMigration" });
          throw mErr;
        }
      }

      // 4) Fresh user.
      this.meta.migrationCompleted = true;
      await writeMeta(this.meta);
      this.setStatus(isRemoteConfigured() ? "online" : "online");
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errorLogging.capture(e, { phase: "loadInitial" });
      this.setStatus("error", msg);
      // Still try the cache so the app remains usable.
      return (await cache.read<GameState>(LOCAL_STATE_KEY)) ?? null;
    }
  }

  /**
   * Persist state. Always writes the local cache immediately for offline
   * safety; remote push is debounced to avoid hammering the backend during
   * rapid in-game updates.
   */
  async push(state: GameState): Promise<void> {
    await cache.write(LOCAL_STATE_KEY, state);
    this.queuePush(state);
  }

  private queuePush(state: GameState) {
    this.pendingState = state;
    cache.write(PENDING_KEY, { hasPending: true }).catch(() => {});
    this.emit();
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.flush(), 1500);
  }

  async flush(): Promise<void> {
    if (this.inFlight || !this.pendingState || !this.userId) return;
    if (!isRemoteConfigured()) {
      // Local-only mode: drain queue silently; data is already in cache.
      this.pendingState = null;
      await cache.remove(PENDING_KEY);
      this.emit();
      return;
    }
    const toSend = this.pendingState;
    this.inFlight = true;
    this.setStatus("syncing");
    try {
      const r = await database.pushState(
        this.userId,
        toSend,
        this.meta.stateVersion,
      );
      if (r.conflict && typeof r.serverVersion === "number") {
        // Server-authoritative: pull immediately so local cache converges
        // before any further pushes.  This prevents drift across sessions.
        this.meta.stateVersion = r.serverVersion;
        try {
          const remote = await database.pullState(this.userId);
          if (remote && remote.state) {
            this.meta.stateVersion = remote.stateVersion;
            await cache.write(LOCAL_STATE_KEY, remote.state);
            this.serverState = remote.state;
          }
        } catch (pullErr) {
          errorLogging.capture(pullErr, { phase: "pullAfterConflict" });
        }
        // Drop pending: server wins.
        this.pendingState = null;
        await cache.remove(PENDING_KEY);
        this.emit();
      } else {
        this.meta.stateVersion = r.stateVersion;
        // Only clear pending if no newer state arrived during flight.
        if (this.pendingState === toSend) {
          this.pendingState = null;
          await cache.remove(PENDING_KEY);
        }
      }
      this.meta.lastSyncAt = Date.now();
      await writeMeta(this.meta);
      this.setStatus("online");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errorLogging.capture(e, { phase: "pushState" });
      analytics.track("sync_failed", { phase: "push", error: msg });
      analytics.track("offline_mode_used");
      this.setStatus("offline", msg);
      // Retry with backoff.
      setTimeout(() => this.flush(), 8000);
    } finally {
      this.inFlight = false;
    }
  }

  async clearAll(): Promise<void> {
    await cache.remove(LOCAL_STATE_KEY);
    await cache.remove(LEGACY_STATE_KEY);
    await cache.remove(META_KEY);
    await cache.remove(PENDING_KEY);
    await auth.clear();
    this.meta = { ...DEFAULT_META };
    this.userId = null;
    this.pendingState = null;
    this.setStatus("idle");
  }

  async getDebugInfo() {
    const localExists = !!(await cache.read<GameState>(LOCAL_STATE_KEY));
    const legacyExists = !!(await cache.read<GameState>(LEGACY_STATE_KEY));
    return {
      ...this.snapshot(),
      localStateExists: localExists,
      legacyStateExists: legacyExists,
      remoteConfigured: isRemoteConfigured(),
    };
  }
}

export const sync = new SyncService();
