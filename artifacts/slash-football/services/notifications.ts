import { NOTIFICATIONS_DISMISSED_KEY } from "@/constants/storageKeys";

import { analytics } from "./analytics";
import { cache } from "./cache";

/**
 * Portable notification abstraction. Defines the *triggers* that re-engage
 * a player (tickets full, matchday ready, season ending, etc.) and produces
 * in-app reminder cards. A future native push adapter can subscribe to
 * `subscribeOutgoing` and forward the same payloads to APNs/FCM/OneSignal/etc.
 */

export type NotificationTrigger =
  | "tickets_full"
  | "matchday_available"
  | "season_ending_soon"
  | "objective_reward_ready"
  | "upgrade_available"
  | "table_position_dropped"
  | "daily_objectives_reset"
  | "pass_reward_claimable"
  | "cosmetic_event_live";

export interface NotificationPayload {
  trigger: NotificationTrigger;
  /** Stable id so duplicates collapse (e.g. "season_ending_soon:S3"). */
  id: string;
  title: string;
  body: string;
  /** Deep-link route (expo-router). */
  route: string | null;
  /** UI severity. */
  severity: "info" | "success" | "warning";
  /** ms-since-epoch. */
  createdAt: number;
}

interface DismissedMap {
  [id: string]: number;
}

type OutgoingListener = (p: NotificationPayload) => void;

class NotificationService {
  private dismissed: DismissedMap = {};
  private ready: Promise<void>;
  private outgoing = new Set<OutgoingListener>();

  constructor() {
    this.ready = (async () => {
      this.dismissed = (await cache.read<DismissedMap>(NOTIFICATIONS_DISMISSED_KEY)) ?? {};
    })();
  }

  /**
   * Compute the active reminder set for a given game-state snapshot. This is
   * pure: it never mutates state. UI calls this each render; future native
   * push wiring can call this on a schedule and forward via sendPush().
   */
  computeReminders(snapshot: ReminderSnapshot): NotificationPayload[] {
    const out: NotificationPayload[] = [];
    const now = Date.now();

    if (snapshot.tickets >= snapshot.maxTickets) {
      out.push({
        trigger: "tickets_full",
        id: "tickets_full",
        title: "Tickets are full",
        body: `You have ${snapshot.tickets} scouting tickets ready to spend.`,
        route: "/scout",
        severity: "success",
        createdAt: now,
      });
    }

    if (!snapshot.seasonFinished && snapshot.matchday <= snapshot.totalMatchdays) {
      out.push({
        trigger: "matchday_available",
        id: `matchday_available:S${snapshot.season}:MD${snapshot.matchday}`,
        title: `Matchday ${snapshot.matchday} ready`,
        body: snapshot.opponentName
          ? `${snapshot.clubName} vs ${snapshot.opponentName}.`
          : "Your next fixture is ready to play.",
        route: "/match",
        severity: "info",
        createdAt: now,
      });
    }

    if (
      !snapshot.seasonFinished &&
      snapshot.totalMatchdays - snapshot.matchday <= 2 &&
      snapshot.matchday <= snapshot.totalMatchdays
    ) {
      out.push({
        trigger: "season_ending_soon",
        id: `season_ending_soon:S${snapshot.season}`,
        title: "Season ending soon",
        body: `Only ${Math.max(1, snapshot.totalMatchdays - snapshot.matchday + 1)} matchdays left this season.`,
        route: "/(tabs)/league",
        severity: "warning",
        createdAt: now,
      });
    }

    if (snapshot.unclaimedRewards > 0) {
      out.push({
        trigger: "objective_reward_ready",
        id: `objective_reward_ready:${snapshot.unclaimedRewards}`,
        title: "Daily reward ready",
        body: `${snapshot.unclaimedRewards} objective ${
          snapshot.unclaimedRewards === 1 ? "reward is" : "rewards are"
        } waiting to be claimed.`,
        route: "/",
        severity: "success",
        createdAt: now,
      });
    }

    if (snapshot.affordableUpgrades > 0) {
      out.push({
        trigger: "upgrade_available",
        id: `upgrade_available:${snapshot.affordableUpgrades}`,
        title: "Upgrade available",
        body: `${snapshot.affordableUpgrades} ${
          snapshot.affordableUpgrades === 1 ? "player is" : "players are"
        } ready for an upgrade.`,
        route: "/(tabs)/squad",
        severity: "info",
        createdAt: now,
      });
    }

    if (snapshot.passClaimableTiers > 0) {
      out.push({
        trigger: "pass_reward_claimable",
        id: `pass_reward_claimable:${snapshot.passClaimableTiers}`,
        title: "Pass rewards waiting",
        body: `${snapshot.passClaimableTiers} season pass ${
          snapshot.passClaimableTiers === 1 ? "reward is" : "rewards are"
        } ready to claim.`,
        route: "/pass",
        severity: "success",
        createdAt: now,
      });
    }

    if (snapshot.cosmeticEventActive) {
      out.push({
        trigger: "cosmetic_event_live",
        id: `cosmetic_event_live:${snapshot.cosmeticEventId ?? "default"}`,
        title: "Limited cosmetic drop live",
        body: snapshot.cosmeticEventLabel ?? "A new cosmetic offer is live in the shop.",
        route: "/shop",
        severity: "info",
        createdAt: now,
      });
    }

    if (snapshot.dailyObjectivesJustReset) {
      out.push({
        trigger: "daily_objectives_reset",
        id: `daily_objectives_reset:${snapshot.dailyObjectivesResetTag}`,
        title: "Daily objectives refreshed",
        body: "A new set of daily objectives is ready.",
        route: "/",
        severity: "info",
        createdAt: now,
      });
    }

    if (snapshot.tablePositionDelta < 0) {
      out.push({
        trigger: "table_position_dropped",
        id: `table_position_dropped:S${snapshot.season}:${snapshot.tablePosition}`,
        title: "You dropped in the table",
        body: `Now ${ordinal(snapshot.tablePosition)} after recent results.`,
        route: "/(tabs)/league",
        severity: "warning",
        createdAt: now,
      });
    }

    return out.filter((n) => !this.dismissed[n.id]);
  }

  async dismiss(id: string): Promise<void> {
    await this.ready;
    this.dismissed[id] = Date.now();
    await cache.write(NOTIFICATIONS_DISMISSED_KEY, this.dismissed);
    analytics.track("reminder_dismissed", { id });
  }

  /** For testing/admin: clear dismissed list so reminders re-appear. */
  async clearDismissed(): Promise<void> {
    await this.ready;
    this.dismissed = {};
    await cache.remove(NOTIFICATIONS_DISMISSED_KEY);
  }

  /**
   * Adapter hook. A future push-notification module can subscribe and
   * receive every reminder we'd like to deliver out-of-app.
   */
  subscribeOutgoing(fn: OutgoingListener): () => void {
    this.outgoing.add(fn);
    return () => this.outgoing.delete(fn);
  }

  /** Called by adapters that have a real notification channel. */
  sendPush(payload: NotificationPayload): void {
    analytics.track("reminder_push_dispatched", {
      trigger: payload.trigger,
      id: payload.id,
    });
    for (const fn of this.outgoing) fn(payload);
  }
}

export interface ReminderSnapshot {
  tickets: number;
  maxTickets: number;
  season: number;
  matchday: number;
  totalMatchdays: number;
  seasonFinished: boolean;
  clubName: string;
  opponentName: string | null;
  unclaimedRewards: number;
  affordableUpgrades: number;
  tablePosition: number;
  /** Negative = dropped, positive = climbed, 0 = unchanged. */
  tablePositionDelta: number;
  /** Number of season-pass tiers ready to claim (free + premium combined). */
  passClaimableTiers: number;
  /** True if a limited cosmetic offer is currently live. */
  cosmeticEventActive: boolean;
  /** Optional id of the live cosmetic event (for stable dedup). */
  cosmeticEventId?: string;
  /** Optional human-readable label for the live cosmetic offer. */
  cosmeticEventLabel?: string;
  /** True the first time we surface today's daily objectives reset. */
  dailyObjectivesJustReset: boolean;
  /** Stable tag for the reset (e.g. ISO yyyy-mm-dd). */
  dailyObjectivesResetTag: string;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export const notifications = new NotificationService();
