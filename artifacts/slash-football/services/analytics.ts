import Constants from "expo-constants";
import { Platform } from "react-native";

import { cache } from "./cache";
import type { AnalyticsService } from "./types";

/**
 * Portable analytics wrapper.
 *
 * The default implementation logs to console in __DEV__ and persists a small
 * ring buffer of recent events so the in-app debug screen can display them.
 * Swap with PostHog/Amplitude/Segment by replacing the exported `analytics`
 * binding — gameplay code only depends on the AnalyticsService interface and
 * the AnalyticsEvent union below.
 */

export type AnalyticsEvent =
  | "app_open"
  | "onboarding_started"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "club_created"
  | "slash_run_started"
  | "slash_run_completed"
  | "slash_run_score"
  | "slash_reward_claimed"
  | "player_unlocked"
  | "player_upgraded"
  | "trait_forged"
  | "lineup_updated"
  | "tactics_updated"
  | "match_started"
  | "match_completed"
  | "highlight_view_started"
  | "highlight_view_completed"
  | "league_table_viewed"
  | "daily_objective_claimed"
  | "season_reward_claimed"
  | "shop_viewed"
  | "settings_viewed"
  | "sync_failed"
  | "migration_failed"
  | "migration_succeeded"
  | "offline_mode_used";

const SESSION_KEY = "slashfootball.analytics.session.v1";
const BUFFER_KEY = "slashfootball.analytics.buffer.v1";
const BUFFER_LIMIT = 50;

interface RecordedEvent {
  event: string;
  props: Record<string, unknown>;
  ts: number;
}

const baseProps = {
  platform: Platform.OS,
  appVersion:
    (Constants.expoConfig?.version as string | undefined) ??
    (Constants.manifest as { version?: string } | null)?.version ??
    "0.0.0",
};

class PortableAnalytics implements AnalyticsService {
  private sessionCount = 0;
  private buffer: RecordedEvent[] = [];
  private ready: Promise<void>;
  /** Serialize writes so rapid track() calls don't clobber the ring buffer. */
  private writeChain: Promise<void> = Promise.resolve();

  constructor() {
    this.ready = (async () => {
      this.sessionCount = ((await cache.read<number>(SESSION_KEY)) ?? 0) + 1;
      await cache.write(SESSION_KEY, this.sessionCount);
      this.buffer = (await cache.read<RecordedEvent[]>(BUFFER_KEY)) ?? [];
    })();
  }

  track(event: string, props: Record<string, unknown> = {}): void {
    const merged = { ...baseProps, sessionCount: this.sessionCount, ...props };
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[analytics]", event, merged);
    }
    this.writeChain = this.writeChain
      .then(() => this.ready)
      .then(() => {
        this.buffer.push({ event, props: merged, ts: Date.now() });
        if (this.buffer.length > BUFFER_LIMIT) {
          this.buffer = this.buffer.slice(-BUFFER_LIMIT);
        }
        return cache.write(BUFFER_KEY, this.buffer);
      })
      .catch(() => {
        /* analytics must never crash the app */
      });
  }

  async recent(): Promise<RecordedEvent[]> {
    await this.ready;
    return [...this.buffer].reverse();
  }

  async clear(): Promise<void> {
    await this.ready;
    this.buffer = [];
    await cache.remove(BUFFER_KEY);
  }
}

export const analytics = new PortableAnalytics();
