import { remoteApi, isRemoteConfigured } from "./remote";
import type { DatabaseService } from "./types";
import type { GameState } from "@/lib/types";

class RestDatabase implements DatabaseService {
  async pullState(userId: string) {
    if (!isRemoteConfigured()) return null;
    try {
      const r = await remoteApi.getState(userId);
      return { state: r.state as GameState | null, stateVersion: r.stateVersion };
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 404) return { state: null, stateVersion: 0 };
      throw e;
    }
  }
  async pushState(userId: string, state: GameState, baseVersion: number) {
    if (!isRemoteConfigured()) {
      // Local-only mode: just bump version locally.
      return { stateVersion: baseVersion + 1 };
    }
    try {
      const r = await remoteApi.putState(userId, state, baseVersion);
      return { stateVersion: r.stateVersion };
    } catch (e) {
      const err = e as Error & { status?: number; body?: { serverVersion?: number } };
      if (err.status === 409) {
        return {
          stateVersion: baseVersion,
          conflict: true,
          serverVersion: err.body?.serverVersion,
        };
      }
      throw e;
    }
  }
}

export const database: DatabaseService = new RestDatabase();
