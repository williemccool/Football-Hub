import { cache } from "./cache";
import { remoteApi } from "./remote";
import type { AuthService } from "./types";

/**
 * Portable identity layer.
 *
 * Default implementation: anonymous/guest accounts with a stable user id.
 * The interface exposes `linkEmail` / `linkProvider` so a real
 * email/social upgrade flow can be added later WITHOUT changing any
 * gameplay or sync code that depends on AuthService.
 */

const USER_ID_KEY = "slashfootball.userId.v1";
const ACCOUNT_KEY = "slashfootball.account.v1";

export interface AccountInfo {
  userId: string;
  /** "guest" until upgraded via linkEmail / linkProvider. */
  kind: "guest" | "email" | "social";
  email?: string;
  provider?: string;
  createdAt: number;
  upgradedAt?: number;
}

function localFallbackId(): string {
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
    await cache.write<AccountInfo>(ACCOUNT_KEY, {
      userId: id,
      kind: "guest",
      createdAt: Date.now(),
    });
    return id;
  }

  async getAccount(): Promise<AccountInfo | null> {
    return cache.read<AccountInfo>(ACCOUNT_KEY);
  }

  /** Stub: real email upgrade should call backend to migrate the guest. */
  async linkEmail(_email: string): Promise<void> {
    const acc = await this.getAccount();
    if (!acc) return;
    await cache.write<AccountInfo>(ACCOUNT_KEY, {
      ...acc,
      kind: "email",
      email: _email,
      upgradedAt: Date.now(),
    });
  }

  /** Stub: real social upgrade should call backend with provider token. */
  async linkProvider(provider: string): Promise<void> {
    const acc = await this.getAccount();
    if (!acc) return;
    await cache.write<AccountInfo>(ACCOUNT_KEY, {
      ...acc,
      kind: "social",
      provider,
      upgradedAt: Date.now(),
    });
  }

  async clear(): Promise<void> {
    await cache.remove(USER_ID_KEY);
    await cache.remove(ACCOUNT_KEY);
  }
}

export const auth = new AnonymousAuth();
