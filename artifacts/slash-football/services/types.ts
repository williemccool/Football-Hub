/**
 * Vendor-neutral service interfaces. Gameplay code only depends on these
 * abstractions; concrete adapters (REST, local, future Postgres/etc.) live
 * in separate files and can be swapped without changing business logic.
 */

import type { GameState } from "@/lib/types";

export type SyncStatus =
  | "idle"
  | "loading"
  | "syncing"
  | "online"
  | "offline"
  | "migrating"
  | "error";

export interface SyncSnapshot {
  status: SyncStatus;
  userId: string | null;
  stateVersion: number;
  lastSyncAt: number | null;
  lastError: string | null;
  pendingActions: number;
  migrationCompleted: boolean;
  /**
   * Set when the server returned a newer canonical state after a 409
   * conflict. Subscribers should re-hydrate, then call
   * `sync.consumeServerState()` to acknowledge.
   */
  serverState?: GameState | null;
}

export interface AuthService {
  /** Returns a stable anonymous user id, creating one on first call. */
  getOrCreateUserId(): Promise<string>;
  clear(): Promise<void>;
}

export interface DatabaseService {
  /** Pull canonical state. Returns null if user has no remote state yet. */
  pullState(
    userId: string,
  ): Promise<{ state: GameState | null; stateVersion: number } | null>;
  /** Push canonical state. Returns the new server version. */
  pushState(
    userId: string,
    state: GameState,
    baseVersion: number,
  ): Promise<{ stateVersion: number; conflict?: boolean; serverVersion?: number }>;
}

export interface ObjectStorageService {
  putReplay(key: string, payload: unknown): Promise<{ key: string; size: number }>;
  getReplay(key: string): Promise<unknown | null>;
  listReplays(prefix?: string): Promise<{ key: string; size: number }[]>;
}

export interface AnalyticsService {
  track(event: string, props?: Record<string, unknown>): void;
}

export interface ErrorLoggingService {
  capture(err: unknown, context?: Record<string, unknown>): void;
}

export interface CacheService {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
