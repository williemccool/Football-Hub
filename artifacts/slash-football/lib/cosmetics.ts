/**
 * Portable cosmetic catalog and product model. No vendor / IAP coupling: a
 * future native IAP layer can resolve `price.currency === "real"` items
 * through StoreKit/Play Billing without changing this file. Game code only
 * deals with `coins` and `gems` (premium soft currency), and only cosmetics
 * may cost gems — never progression.
 */

export type CosmeticCategory =
  | "kit"
  | "crest"
  | "pitch"
  | "celebration"
  | "uiTheme"
  | "banner";

export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";

export type CosmeticCurrency = "coins" | "gems";

export interface CosmeticPrice {
  currency: CosmeticCurrency;
  amount: number;
}

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  rarity: CosmeticRarity;
  price: CosmeticPrice;
  /** Hex tint used in the preview thumbnail. */
  accent: string;
  /** True if obtainable only via the season pass (hidden from the shop). */
  passOnly?: boolean;
  /** Optional limited-time offer end timestamp (ms-since-epoch). */
  limitedUntil?: number;
  tags?: string[];
}

export interface CosmeticBundle {
  id: string;
  name: string;
  description: string;
  itemIds: string[];
  price: CosmeticPrice;
  rarity: CosmeticRarity;
  /** Saving vs buying contents individually, expressed as a percent. */
  savingsPct: number;
  limitedUntil?: number;
}

export const CATEGORY_LABEL: Record<CosmeticCategory, string> = {
  kit: "Kits",
  crest: "Crests",
  pitch: "Pitch",
  celebration: "Celebrations",
  uiTheme: "UI Themes",
  banner: "Club Banners",
};

export const RARITY_ORDER: Record<CosmeticRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

export const RARITY_COLOR: Record<CosmeticRarity, string> = {
  common: "#8E8E93",
  rare: "#41D7FF",
  epic: "#B36BFF",
  legendary: "#FFE066",
};

/**
 * Catalog. Keep prices flat-curve and fair: cosmetic-only spend, no power.
 * Coin-priced items are reachable through normal play; gem-priced items are
 * the optional premium ladder. Any pay-to-win price (e.g. coins on a player
 * upgrade pack) MUST be kept out of this file.
 */
export const COSMETIC_CATALOG: CosmeticItem[] = [
  // Kits
  {
    id: "kit_classic_stripes",
    category: "kit",
    name: "Classic Stripes",
    description: "Heritage cotton revival.",
    rarity: "common",
    price: { currency: "coins", amount: 800 },
    accent: "#C9CCD1",
  },
  {
    id: "kit_aurora_home",
    category: "kit",
    name: "Aurora Home",
    description: "Neon-stitched home kit with reactive trim.",
    rarity: "rare",
    price: { currency: "coins", amount: 2400 },
    accent: "#41D7FF",
  },
  {
    id: "kit_midnight_away",
    category: "kit",
    name: "Midnight Away",
    description: "Stealth carbon weave for road fixtures.",
    rarity: "epic",
    price: { currency: "gems", amount: 280 },
    accent: "#6B7BFF",
  },
  {
    id: "kit_solar_flare",
    category: "kit",
    name: "Solar Flare 3rd",
    description: "Limited season drop.",
    rarity: "legendary",
    price: { currency: "gems", amount: 720 },
    accent: "#FFE066",
    tags: ["limited"],
  },

  // Crests
  {
    id: "crest_stadium_rose",
    category: "crest",
    name: "Stadium Rose",
    description: "Hand-drawn heritage crest.",
    rarity: "common",
    price: { currency: "coins", amount: 600 },
    accent: "#FF8AB3",
  },
  {
    id: "crest_bolt_sigil",
    category: "crest",
    name: "Bolt Sigil",
    description: "Animated lightning crest.",
    rarity: "rare",
    price: { currency: "coins", amount: 1800 },
    accent: "#41D7FF",
  },
  {
    id: "crest_phoenix_mark",
    category: "crest",
    name: "Phoenix Mark",
    description: "Foil-pressed crest, reacts to wins.",
    rarity: "epic",
    price: { currency: "gems", amount: 240 },
    accent: "#FF7A4D",
  },

  // Pitch themes
  {
    id: "pitch_stadium_lights",
    category: "pitch",
    name: "Stadium Lights",
    description: "Floodlit broadcast theme.",
    rarity: "rare",
    price: { currency: "coins", amount: 2000 },
    accent: "#FFFFFF",
  },
  {
    id: "pitch_sunset_match",
    category: "pitch",
    name: "Sunset Match",
    description: "Warm-tone broadcast palette.",
    rarity: "epic",
    price: { currency: "gems", amount: 260 },
    accent: "#FFB347",
  },
  {
    id: "pitch_holographic",
    category: "pitch",
    name: "Holographic Pitch",
    description: "Animated grid overlay.",
    rarity: "legendary",
    price: { currency: "gems", amount: 640 },
    accent: "#B36BFF",
  },

  // Celebrations
  {
    id: "fx_lightning_strike",
    category: "celebration",
    name: "Lightning Strike",
    description: "Bolt FX on every goal.",
    rarity: "rare",
    price: { currency: "coins", amount: 1600 },
    accent: "#41D7FF",
  },
  {
    id: "fx_confetti_burst",
    category: "celebration",
    name: "Confetti Burst",
    description: "Stadium-wide cascade.",
    rarity: "epic",
    price: { currency: "gems", amount: 220 },
    accent: "#FFE066",
  },
  {
    id: "fx_fireworks",
    category: "celebration",
    name: "Fireworks Show",
    description: "End-of-match payoff.",
    rarity: "legendary",
    price: { currency: "gems", amount: 580 },
    accent: "#FF4DA6",
  },

  // UI themes
  {
    id: "ui_neo_chrome",
    category: "uiTheme",
    name: "Neo Chrome",
    description: "High-contrast UI accents and chrome rims.",
    rarity: "rare",
    price: { currency: "coins", amount: 1500 },
    accent: "#9FE9FF",
  },
  {
    id: "ui_obsidian",
    category: "uiTheme",
    name: "Obsidian",
    description: "Deep matte UI palette with gold trim.",
    rarity: "epic",
    price: { currency: "gems", amount: 200 },
    accent: "#FFD27A",
  },

  // Banners
  {
    id: "banner_terrace_chant",
    category: "banner",
    name: "Terrace Chant",
    description: "Hand-painted away-end banner for your profile flair.",
    rarity: "rare",
    price: { currency: "coins", amount: 900 },
    accent: "#FF6B6B",
  },
  {
    id: "banner_north_stand",
    category: "banner",
    name: "North Stand",
    description: "Tifo-style profile banner.",
    rarity: "epic",
    price: { currency: "gems", amount: 180 },
    accent: "#7AC0FF",
  },

  // Pass-only (hidden from shop)
  {
    id: "kit_founder_alpha",
    category: "kit",
    name: "Founder Alpha Kit",
    description: "Awarded to founder season pass holders.",
    rarity: "legendary",
    price: { currency: "gems", amount: 0 },
    accent: "#FFE066",
    passOnly: true,
  },
];

export const COSMETIC_BUNDLES: CosmeticBundle[] = [
  {
    id: "bundle_starter_aurora",
    name: "Aurora Starter Pack",
    description: "Aurora Home kit + Bolt Sigil crest + Stadium Lights pitch.",
    itemIds: ["kit_aurora_home", "crest_bolt_sigil", "pitch_stadium_lights"],
    price: { currency: "coins", amount: 4800 },
    rarity: "rare",
    savingsPct: 25,
  },
  {
    id: "bundle_legend_drop",
    name: "Legend Drop",
    description: "Solar Flare 3rd + Holographic Pitch + Fireworks Show.",
    itemIds: ["kit_solar_flare", "pitch_holographic", "fx_fireworks"],
    price: { currency: "gems", amount: 1480 },
    rarity: "legendary",
    savingsPct: 22,
  },
];

export function listByCategory(c: CosmeticCategory): CosmeticItem[] {
  return COSMETIC_CATALOG.filter((i) => i.category === c && !i.passOnly).sort(
    (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity],
  );
}

export function getCosmetic(id: string): CosmeticItem | undefined {
  return COSMETIC_CATALOG.find((i) => i.id === id);
}

export function getBundle(id: string): CosmeticBundle | undefined {
  return COSMETIC_BUNDLES.find((b) => b.id === id);
}

/**
 * Apply a `cosmetic_pricing_preset` flag value to an item price. Keeps the
 * actual catalog values stable while letting live-ops experiment with
 * launch elasticity (e.g. "soft_launch" lowers gem prices 20%).
 */
export function priceForPreset(
  base: CosmeticPrice,
  preset: "default" | "soft_launch" | "promo" = "default",
): CosmeticPrice {
  if (preset === "soft_launch")
    return { ...base, amount: Math.max(1, Math.round(base.amount * 0.8)) };
  if (preset === "promo")
    return { ...base, amount: Math.max(1, Math.round(base.amount * 0.65)) };
  return base;
}
