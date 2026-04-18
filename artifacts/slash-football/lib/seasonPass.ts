/**
 * Portable season-pass model. Two reward tracks (free + premium) layered on
 * the existing `seasonXp` field, so no new persistence wiring is needed.
 *
 * Rules of the road:
 * - Premium track is COSMETICS-FIRST. Any progression rewards must be small
 *   and never decisive vs free play.
 * - Reward generosity is centralised in `applyGenerosity()` so live-ops
 *   can dial it via the `pass_reward_generosity` feature flag without
 *   touching tier definitions.
 */

export type PassRewardKind =
  | "coins"
  | "gems"
  | "essence"
  | "ticket"
  | "trait_fragment"
  | "cosmetic"
  | "catalyst";

export interface PassReward {
  kind: PassRewardKind;
  amount?: number;
  /** Cosmetic id when kind === "cosmetic". */
  cosmeticId?: string;
  label: string;
}

export interface PassTier {
  tier: number; // 1-based
  xpRequired: number; // cumulative xp needed to *reach* this tier
  freeReward: PassReward | null;
  premiumReward: PassReward | null;
}

const xp = (n: number) => n;

export const PASS_TIERS: PassTier[] = [
  {
    tier: 1,
    xpRequired: xp(0),
    freeReward: { kind: "coins", amount: 200, label: "200 coins" },
    premiumReward: { kind: "gems", amount: 80, label: "80 gems" },
  },
  {
    tier: 2,
    xpRequired: xp(120),
    freeReward: { kind: "ticket", amount: 1, label: "1 scout ticket" },
    premiumReward: { kind: "gems", amount: 60, label: "60 gems" },
  },
  {
    tier: 3,
    xpRequired: xp(280),
    freeReward: { kind: "coins", amount: 350, label: "350 coins" },
    premiumReward: {
      kind: "cosmetic",
      cosmeticId: "banner_terrace_chant",
      label: "Terrace Chant banner",
    },
  },
  {
    tier: 4,
    xpRequired: xp(480),
    freeReward: { kind: "trait_fragment", amount: 1, label: "1 trait fragment" },
    premiumReward: { kind: "gems", amount: 120, label: "120 gems" },
  },
  {
    tier: 5,
    xpRequired: xp(720),
    freeReward: null,
    premiumReward: {
      kind: "cosmetic",
      cosmeticId: "fx_lightning_strike",
      label: "Lightning Strike celebration",
    },
  },
  {
    tier: 6,
    xpRequired: xp(1000),
    freeReward: { kind: "coins", amount: 600, label: "600 coins" },
    premiumReward: { kind: "gems", amount: 100, label: "100 gems" },
  },
  {
    tier: 7,
    xpRequired: xp(1320),
    freeReward: { kind: "essence", amount: 4, label: "4 essence" },
    premiumReward: {
      kind: "cosmetic",
      cosmeticId: "kit_midnight_away",
      label: "Midnight Away kit",
    },
  },
  {
    tier: 8,
    xpRequired: xp(1700),
    freeReward: { kind: "ticket", amount: 2, label: "2 scout tickets" },
    premiumReward: { kind: "gems", amount: 180, label: "180 gems" },
  },
  {
    tier: 9,
    xpRequired: xp(2150),
    freeReward: { kind: "coins", amount: 900, label: "900 coins" },
    premiumReward: {
      kind: "cosmetic",
      cosmeticId: "pitch_holographic",
      label: "Holographic Pitch theme",
    },
  },
  {
    tier: 10,
    xpRequired: xp(2700),
    freeReward: { kind: "trait_fragment", amount: 2, label: "2 trait fragments" },
    premiumReward: {
      kind: "cosmetic",
      cosmeticId: "kit_founder_alpha",
      label: "Founder Alpha Kit",
    },
  },
];

export const MAX_TIER = PASS_TIERS.length;

export function tierForXp(currentXp: number): number {
  let tier = 1;
  for (const t of PASS_TIERS) {
    if (currentXp >= t.xpRequired) tier = t.tier;
    else break;
  }
  return tier;
}

export function progressInTier(currentXp: number): {
  tier: number;
  nextTier: number | null;
  current: number;
  required: number;
  pct: number;
} {
  const tier = tierForXp(currentXp);
  const cur = PASS_TIERS[tier - 1]!;
  const next = PASS_TIERS[tier];
  if (!next)
    return {
      tier,
      nextTier: null,
      current: 1,
      required: 1,
      pct: 1,
    };
  const span = next.xpRequired - cur.xpRequired;
  const into = currentXp - cur.xpRequired;
  return {
    tier,
    nextTier: next.tier,
    current: into,
    required: span,
    pct: span <= 0 ? 1 : Math.max(0, Math.min(1, into / span)),
  };
}

export function tier(n: number): PassTier | undefined {
  return PASS_TIERS[n - 1];
}

/**
 * Apply a reward-generosity preset to an amount. Cosmetic rewards are
 * unaffected; only numeric currency amounts scale.
 */
export function applyGenerosity(
  reward: PassReward,
  preset: "default" | "generous" | "lean" = "default",
): PassReward {
  if (reward.kind === "cosmetic" || reward.amount == null) return reward;
  const factor = preset === "generous" ? 1.35 : preset === "lean" ? 0.8 : 1;
  return { ...reward, amount: Math.max(1, Math.round(reward.amount * factor)) };
}
