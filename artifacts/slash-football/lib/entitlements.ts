/**
 * Centralized entitlement model. Every feature that asks "does the user
 * own X?" should flow through here so the logic stays consistent across
 * shop / pass / cosmetics / future founder & starter packs.
 *
 * Entitlements are derived from two sources of truth:
 *   - GameState (cosmetics owned/equipped, season pass premium ownership)
 *   - the purchases service (real-money product ownership receipts)
 *
 * The game itself never asks the vendor SDK directly — it asks these
 * helpers, which makes swapping in StoreKit/Play Billing later a one-file
 * change instead of a ripple through the UI.
 */

import { COSMETIC_BUNDLES, type CosmeticBundle } from "./cosmetics";
import type { GameState } from "./types";

export type EntitlementId =
  | `cosmetic:${string}`
  | `bundle:${string}`
  | "pass:premium"
  | "founder_pack"
  | "starter_pack";

export interface EntitlementSummary {
  /** Cosmetic ids the user owns, including those granted by pass/bundles. */
  cosmetics: string[];
  /** Currently-equipped cosmetic by category (e.g. { kit: "kit_aurora_home" }). */
  equipped: Record<string, string>;
  /** Bundles whose every item the user owns. */
  bundlesOwned: string[];
  /** True if the current season's premium pass is owned. */
  passPremium: boolean;
  /** Total cosmetic items in the catalog (for collection-progress UI). */
  catalogCount: number;
  /** Cosmetics owned out of catalog (collection progress). */
  ownedCount: number;
}

export function summarize(state: GameState, totalCatalog: number): EntitlementSummary {
  const owned = state.cosmetics.owned;
  const ownedSet = new Set(owned);
  const bundlesOwned = COSMETIC_BUNDLES.filter((b) =>
    b.itemIds.every((id) => ownedSet.has(id)),
  ).map((b) => b.id);
  return {
    cosmetics: [...owned],
    equipped: { ...state.cosmetics.equipped },
    bundlesOwned,
    passPremium: !!state.seasonPass.premiumOwned,
    catalogCount: totalCatalog,
    ownedCount: owned.length,
  };
}

export function ownsCosmetic(state: GameState, cosmeticId: string): boolean {
  return state.cosmetics.owned.includes(cosmeticId);
}

export function ownsBundle(state: GameState, bundle: CosmeticBundle): boolean {
  const ownedSet = new Set(state.cosmetics.owned);
  return bundle.itemIds.every((id) => ownedSet.has(id));
}

export function bundleProgress(
  state: GameState,
  bundle: CosmeticBundle,
): { owned: number; total: number; complete: boolean } {
  const ownedSet = new Set(state.cosmetics.owned);
  const owned = bundle.itemIds.filter((id) => ownedSet.has(id)).length;
  return { owned, total: bundle.itemIds.length, complete: owned === bundle.itemIds.length };
}

export function passPremium(state: GameState): boolean {
  return !!state.seasonPass.premiumOwned;
}

export function categoryProgress(
  state: GameState,
  totalInCategory: number,
  ownedInCategory: number,
): { owned: number; total: number; pct: number } {
  return {
    owned: ownedInCategory,
    total: totalInCategory,
    pct: totalInCategory > 0 ? Math.round((ownedInCategory / totalInCategory) * 100) : 0,
  };
}
