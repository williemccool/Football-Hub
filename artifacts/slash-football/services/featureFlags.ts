import { FEATURE_FLAGS_KEY } from "@/constants/storageKeys";

import { cache } from "./cache";
import { tester } from "./tester";

/**
 * Portable feature-flag and experiment system. Flags are evaluated locally
 * from a registry of defaults plus per-cohort overrides plus user overrides
 * stored in cache. Adapter for a remote service can wrap `setRemoteSnapshot`.
 *
 * - Boolean flags: on/off
 * - Variant flags: pick one of several string values
 *
 * Gameplay code should read flags via `flags.bool(name)` / `flags.variant(name)`.
 */

export type FlagId =
  // Tutorials / FTUE
  | "tutorial_enabled"
  | "ftue_first_run_quick_pack"
  // Slash variants
  | "slash_hazard_intensity" // variant: "low" | "default" | "high"
  | "slash_reward_reveal" // variant: "instant" | "salvage_modal"
  // League / progression
  | "league_table_visible_at_start"
  | "season_urgency_banner"
  // Engagement
  | "session_sentiment_prompt"
  | "next_action_banner"
  // Live-ops
  | "ops_admin_visible";

interface BoolDefinition {
  type: "bool";
  default: boolean;
  description: string;
}
interface VariantDefinition {
  type: "variant";
  variants: readonly string[];
  default: string;
  description: string;
}
type FlagDefinition = BoolDefinition | VariantDefinition;

const REGISTRY: Record<FlagId, FlagDefinition> = {
  tutorial_enabled: {
    type: "bool",
    default: true,
    description: "Show first-run guided tutorial on the hub.",
  },
  ftue_first_run_quick_pack: {
    type: "bool",
    default: true,
    description: "Award a small starter pack the first time the user opens the hub.",
  },
  slash_hazard_intensity: {
    type: "variant",
    variants: ["low", "default", "high"],
    default: "default",
    description: "Multiplier preset applied to slash hazard spawn weights.",
  },
  slash_reward_reveal: {
    type: "variant",
    variants: ["instant", "salvage_modal"],
    default: "salvage_modal",
    description: "How a fresh prospect from a slash run is presented.",
  },
  league_table_visible_at_start: {
    type: "bool",
    default: true,
    description: "Whether the league table is visible from the first session.",
  },
  season_urgency_banner: {
    type: "bool",
    default: true,
    description: "Show an end-of-season urgency banner during the final 3 matchdays.",
  },
  session_sentiment_prompt: {
    type: "bool",
    default: true,
    description: "Occasionally ask testers a one-tap sentiment question after key sessions.",
  },
  next_action_banner: {
    type: "bool",
    default: true,
    description: "Show a 'next best action' banner on the hub.",
  },
  ops_admin_visible: {
    type: "bool",
    default: __DEV__,
    description: "Expose live-ops/admin tools in settings.",
  },
};

/** Per-cohort overrides. Keep small and explicit. */
const COHORT_OVERRIDES: Record<string, Partial<Record<FlagId, boolean | string>>> = {
  "internal-dev": {
    ops_admin_visible: true,
    session_sentiment_prompt: false, // don't pester devs
  },
  "internal-qa": {
    ops_admin_visible: true,
  },
  "alpha-wave-1": {
    slash_hazard_intensity: "default",
  },
};

interface Snapshot {
  /** Hard overrides set by the user / live-ops (highest priority). */
  overrides: Partial<Record<FlagId, boolean | string>>;
}

class FeatureFlagStore {
  private snap: Snapshot = { overrides: {} };
  private ready: Promise<void>;
  private listeners = new Set<() => void>();

  constructor() {
    this.ready = (async () => {
      const loaded = await cache.read<Snapshot>(FEATURE_FLAGS_KEY);
      if (loaded?.overrides) {
        this.snap = loaded;
        // Notify any consumer that may have rendered with default values
        // before persisted overrides were loaded from storage.
        this.notify();
      }
    })();
  }

  registry(): Record<FlagId, FlagDefinition> {
    return REGISTRY;
  }

  bool(id: FlagId): boolean {
    const def = REGISTRY[id];
    if (def.type !== "bool") return false;
    const val = this.resolve(id);
    return typeof val === "boolean" ? val : def.default;
  }

  variant(id: FlagId): string {
    const def = REGISTRY[id];
    if (def.type !== "variant") return "";
    const val = this.resolve(id);
    if (typeof val === "string" && def.variants.includes(val)) return val;
    return def.default;
  }

  private resolve(id: FlagId): boolean | string {
    const userOverride = this.snap.overrides[id];
    if (userOverride !== undefined) return userOverride;
    const cohort = tester.current()?.cohort;
    if (cohort) {
      const cohortOverride = COHORT_OVERRIDES[cohort]?.[id];
      if (cohortOverride !== undefined) return cohortOverride;
    }
    return REGISTRY[id].default;
  }

  /** Set a user override (used by the in-app debug panel / live-ops admin). */
  async setOverride(id: FlagId, value: boolean | string | null): Promise<void> {
    await this.ready;
    if (value === null) {
      delete this.snap.overrides[id];
    } else {
      this.snap.overrides[id] = value;
    }
    await cache.write(FEATURE_FLAGS_KEY, this.snap);
    this.notify();
  }

  async clearOverrides(): Promise<void> {
    await this.ready;
    this.snap = { overrides: {} };
    await cache.write(FEATURE_FLAGS_KEY, this.snap);
    this.notify();
  }

  /** Snapshot of all flags with their resolved values (for admin UI). */
  list(): { id: FlagId; def: FlagDefinition; value: boolean | string }[] {
    return (Object.keys(REGISTRY) as FlagId[]).map((id) => {
      const def = REGISTRY[id];
      const value = def.type === "bool" ? this.bool(id) : this.variant(id);
      return { id, def, value };
    });
  }

  whenReady(): Promise<void> {
    return this.ready;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }
}

export const flags = new FeatureFlagStore();
