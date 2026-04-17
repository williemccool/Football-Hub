import { cache } from "./cache";
import { remoteApi } from "./remote";
import type { AuthService } from "./types";

const USER_ID_KEY = "slashfootball.userId.v1";

function localFallbackId(): string {
  // crypto-grade not required; this id is local-only when offline.
  return `local_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

class AnonymousAuth implements AuthService {
  async getOrCreateUserId(): Promise<string> {
    const existing = await cache.read<string>(USER_ID_KEY);
    if (existing) return existing;

    let id: string;
    try {
      const created = await remoteApi.createUser();
      id = created.id;
    } catch {
      id = localFallbackId();
    }
    await cache.write(USER_ID_KEY, id);
    return id;
  }

  async clear(): Promise<void> {
    await cache.remove(USER_ID_KEY);
  }
}

export const auth: AuthService = new AnonymousAuth();
