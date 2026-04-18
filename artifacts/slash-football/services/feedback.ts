import { FEEDBACK_QUEUE_KEY } from "@/constants/storageKeys";

import { analytics } from "./analytics";
import { cache } from "./cache";
import { tester } from "./tester";

/**
 * Portable feedback collection. Stores submissions in a local queue (so the
 * app works fully offline) and emits an analytics event for every submission.
 * A future remote sink can drain the queue via `getQueue` / `markDelivered`.
 */

export type FeedbackCategory =
  | "controls"
  | "slash_fun"
  | "rewards"
  | "progression"
  | "match_fairness"
  | "visuals"
  | "performance"
  | "bug"
  | "confusion"
  | "other";

export type FeedbackKind = "report_issue" | "send_feedback" | "session_rating" | "sentiment_prompt";

export interface FeedbackEntry {
  id: string;
  kind: FeedbackKind;
  category: FeedbackCategory;
  /** 1..5 (only meaningful for session_rating / sentiment_prompt). */
  rating: number | null;
  message: string;
  /** Free-form context (current screen, last event, …). */
  context: Record<string, unknown>;
  installId: string | null;
  cohort: string | null;
  buildChannel: string;
  appVersion: string;
  ts: number;
  delivered: boolean;
}

const QUEUE_LIMIT = 100;

function genId(): string {
  return `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

class FeedbackStore {
  private queue: FeedbackEntry[] = [];
  private ready: Promise<void>;
  private writeChain: Promise<void> = Promise.resolve();

  constructor() {
    this.ready = (async () => {
      this.queue = (await cache.read<FeedbackEntry[]>(FEEDBACK_QUEUE_KEY)) ?? [];
    })();
  }

  async submit(input: {
    kind: FeedbackKind;
    category: FeedbackCategory;
    rating?: number | null;
    message?: string;
    context?: Record<string, unknown>;
  }): Promise<FeedbackEntry> {
    await this.ready;
    const t = tester.current();
    const build = tester.getBuild();
    const entry: FeedbackEntry = {
      id: genId(),
      kind: input.kind,
      category: input.category,
      rating: input.rating ?? null,
      message: (input.message ?? "").slice(0, 1000),
      context: input.context ?? {},
      installId: t?.installId ?? null,
      cohort: t?.cohort ?? null,
      buildChannel: build.buildChannel,
      appVersion: build.appVersion,
      ts: Date.now(),
      delivered: false,
    };
    this.queue.push(entry);
    if (this.queue.length > QUEUE_LIMIT) this.queue = this.queue.slice(-QUEUE_LIMIT);
    this.writeChain = this.writeChain
      .then(() => cache.write(FEEDBACK_QUEUE_KEY, this.queue))
      .catch(() => {});
    analytics.track("feedback_submitted", {
      kind: entry.kind,
      category: entry.category,
      rating: entry.rating,
      hasMessage: entry.message.length > 0,
    });
    return entry;
  }

  async getQueue(): Promise<FeedbackEntry[]> {
    await this.ready;
    return [...this.queue].reverse();
  }

  async markDelivered(ids: string[]): Promise<void> {
    await this.ready;
    const set = new Set(ids);
    this.queue = this.queue.map((e) => (set.has(e.id) ? { ...e, delivered: true } : e));
    await cache.write(FEEDBACK_QUEUE_KEY, this.queue);
  }

  async clear(): Promise<void> {
    await this.ready;
    this.queue = [];
    await cache.remove(FEEDBACK_QUEUE_KEY);
  }
}

export const feedback = new FeedbackStore();
