import Constants from "expo-constants";
import { Platform } from "react-native";

import { cache } from "./cache";
import type { ErrorLoggingService } from "./types";

/**
 * Portable error logging wrapper. Captures runtime errors with structured
 * context and persists a recent ring buffer so the debug screen can show
 * them without a remote sink. Swap for Sentry/Bugsnag by replacing the
 * exported `errorLogging` binding.
 *
 * Sensitive fields are scrubbed before persistence.
 */

const BUFFER_KEY = "slashfootball.errorLog.buffer.v1";
const BUFFER_LIMIT = 30;
const SENSITIVE_KEYS = ["userId", "token", "email", "password", "auth"];

interface RecordedError {
  message: string;
  name?: string;
  stack?: string;
  context: Record<string, unknown>;
  ts: number;
}

const baseContext = {
  platform: Platform.OS,
  appVersion:
    (Constants.expoConfig?.version as string | undefined) ??
    (Constants.manifest as { version?: string } | null)?.version ??
    "0.0.0",
};

function scrub(ctx: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = SENSITIVE_KEYS.includes(k) ? "[redacted]" : v;
  }
  return out;
}

class PortableErrorLogger implements ErrorLoggingService {
  private buffer: RecordedError[] = [];
  private ready: Promise<void>;
  private writeChain: Promise<void> = Promise.resolve();

  constructor() {
    this.ready = (async () => {
      this.buffer = (await cache.read<RecordedError[]>(BUFFER_KEY)) ?? [];
    })();
  }

  capture(err: unknown, context: Record<string, unknown> = {}): void {
    const e = err instanceof Error ? err : new Error(String(err));
    const rec: RecordedError = {
      message: e.message,
      name: e.name,
      stack: e.stack,
      context: { ...baseContext, ...scrub(context) },
      ts: Date.now(),
    };
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[error]", rec.message, rec.context);
    }
    this.writeChain = this.writeChain
      .then(() => this.ready)
      .then(() => {
        this.buffer.push(rec);
        if (this.buffer.length > BUFFER_LIMIT) {
          this.buffer = this.buffer.slice(-BUFFER_LIMIT);
        }
        return cache.write(BUFFER_KEY, this.buffer);
      })
      .catch(() => {
        /* never crash on logging */
      });
  }

  async recent(): Promise<RecordedError[]> {
    await this.ready;
    return [...this.buffer].reverse();
  }

  async clear(): Promise<void> {
    await this.ready;
    this.buffer = [];
    await cache.remove(BUFFER_KEY);
  }
}

export const errorLogging = new PortableErrorLogger();
