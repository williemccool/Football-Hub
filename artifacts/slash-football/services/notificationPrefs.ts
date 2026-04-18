import { NOTIFICATION_PREFS_KEY } from "@/constants/storageKeys";

import { analytics } from "./analytics";
import { cache } from "./cache";

/**
 * User-controllable notification categories. The reminder bar (in-app) and
 * any future push adapter both consult this service before surfacing or
 * dispatching a payload, so the UX is consistent across surfaces.
 */
export type NotificationCategory =
  | "gameplay"
  | "season"
  | "shop_pass"
  | "marketing";

export interface NotificationPrefs {
  gameplay: boolean;
  season: boolean;
  shop_pass: boolean;
  /** Off by default — opt-in only, never opt-out. */
  marketing: boolean;
}

const DEFAULTS: NotificationPrefs = {
  gameplay: true,
  season: true,
  shop_pass: true,
  marketing: false,
};

type Listener = (p: NotificationPrefs) => void;

class NotificationPrefsService {
  private prefs: NotificationPrefs = { ...DEFAULTS };
  private ready: Promise<void>;
  private listeners = new Set<Listener>();

  constructor() {
    this.ready = (async () => {
      const loaded = await cache.read<Partial<NotificationPrefs>>(NOTIFICATION_PREFS_KEY);
      if (loaded) this.prefs = { ...DEFAULTS, ...loaded };
    })();
  }

  whenReady(): Promise<void> {
    return this.ready;
  }

  get(): NotificationPrefs {
    return { ...this.prefs };
  }

  isEnabled(category: NotificationCategory): boolean {
    return !!this.prefs[category];
  }

  async set(category: NotificationCategory, value: boolean): Promise<void> {
    await this.ready;
    if (this.prefs[category] === value) return;
    this.prefs = { ...this.prefs, [category]: value };
    await cache.write(NOTIFICATION_PREFS_KEY, this.prefs);
    analytics.track("notification_pref_changed", { category, value });
    for (const fn of this.listeners) fn(this.prefs);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

/**
 * Map a notification trigger to the category that gates it. Keep this in
 * one place so adding new triggers stays a single-line change.
 */
export function categoryForTrigger(
  trigger: import("./notifications").NotificationTrigger,
): NotificationCategory {
  switch (trigger) {
    case "tickets_full":
    case "matchday_available":
    case "objective_reward_ready":
    case "upgrade_available":
    case "daily_objectives_reset":
      return "gameplay";
    case "season_ending_soon":
    case "table_position_dropped":
      return "season";
    case "pass_reward_claimable":
    case "cosmetic_event_live":
      return "shop_pass";
    default:
      return "gameplay";
  }
}

export const notificationPrefs = new NotificationPrefsService();
