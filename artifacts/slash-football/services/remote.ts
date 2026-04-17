/**
 * Thin REST client. Concrete transport for the portable services.
 * Base URL comes from `EXPO_PUBLIC_API_URL`. If not set, all calls reject —
 * the higher-level services (database, objectStorage, sync) treat that as
 * "offline" and degrade to local-cache-only mode. This keeps backend
 * portability: switch hosts by changing one env var, no code changes.
 */

import type { GameState } from "@/lib/types";

const BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

export function isRemoteConfigured(): boolean {
  return BASE.length > 0;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 8000,
): Promise<T> {
  if (!isRemoteConfigured()) {
    throw new Error("remote_not_configured");
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const err = new Error(`http_${res.status}`) as Error & {
        status?: number;
        body?: unknown;
      };
      err.status = res.status;
      err.body = errBody;
      throw err;
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const remoteApi = {
  createUser: () => request<{ id: string; createdAt: number }>("POST", "/v1/users"),
  getState: (userId: string) =>
    request<{
      userId: string;
      state: GameState | null;
      stateVersion: number;
      updatedAt: number;
    }>("GET", `/v1/state/${encodeURIComponent(userId)}`),
  putState: (userId: string, state: GameState, baseVersion: number) =>
    request<{ userId: string; stateVersion: number; updatedAt: number }>(
      "PUT",
      `/v1/state/${encodeURIComponent(userId)}`,
      { state, baseVersion },
    ),
  putReplay: (key: string, data: unknown) =>
    request<{ key: string; size: number; createdAt: number }>(
      "PUT",
      `/v1/replays/${encodeURIComponent(key)}`,
      { data },
    ),
  getReplay: (key: string) =>
    request<{ key: string; data: unknown; createdAt: number }>(
      "GET",
      `/v1/replays/${encodeURIComponent(key)}`,
    ),
  listReplays: (prefix?: string) =>
    request<{ items: { key: string; size: number; createdAt: number }[] }>(
      "GET",
      `/v1/replays${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ""}`,
    ),
};
