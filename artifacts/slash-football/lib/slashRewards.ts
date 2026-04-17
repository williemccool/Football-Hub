import type { ObjectKind, Role, SlashReward } from "./types";

const ROLES: Role[] = ["GK", "CB", "FB", "DM", "CM", "AM", "WG", "ST"];

export type ObjectCategory = "positive" | "hazard" | "utility";

export const OBJECT_CONFIG: Record<
  ObjectKind,
  {
    points: number;
    color: string;
    label: string;
    icon: string;
    category: ObjectCategory;
    description: string;
    size?: number;
  }
> = {
  shard:      { points: 100, color: "#00FF88", label: "Shard",        icon: "octagon",        category: "positive", description: "Generic player shard" },
  shardRole:  { points: 140, color: "#41D7FF", label: "Role Shard",   icon: "shield",         category: "positive", description: "Shard for a specific role" },
  trait:      { points: 200, color: "#B36BFF", label: "Trait",        icon: "activity",       category: "positive", description: "Trait fragment" },
  coin:       { points: 75,  color: "#FFD60A", label: "Coins",        icon: "circle",         category: "positive", description: "Cold hard cash" },
  catalyst:   { points: 350, color: "#FF8A3D", label: "Catalyst",     icon: "aperture",       category: "positive", description: "Rare evolution material", size: 46 },
  golden:     { points: 500, color: "#FFE066", label: "Golden Pack",  icon: "star",           category: "positive", description: "Jackpot — premium rewards", size: 44 },
  comboOrb:   { points: 60,  color: "#9CFF66", label: "Combo Orb",    icon: "zap",            category: "utility",  description: "+2 instant combo" },
  scoutIntel: { points: 150, color: "#5BFFEA", label: "Scout Intel",  icon: "eye",            category: "utility",  description: "Targets one role for next reward" },
  physio:     { points: 120, color: "#A0F0FF", label: "Physio Kit",   icon: "plus-square",    category: "utility",  description: "Heals or shields next injury" },
  morale:     { points: 110, color: "#FF8AC2", label: "Morale Boost", icon: "smile",          category: "utility",  description: "Next match composure boost" },
  trap:       { points: -300, color: "#FF3B5C", label: "Red Card",    icon: "x",              category: "hazard",   description: "Score & combo loss" },
  injury:     { points: -200, color: "#FF6B4A", label: "Injury",      icon: "alert-triangle", category: "hazard",   description: "May injure a lineup player" },
  burnout:    { points: -180, color: "#C84BFF", label: "Burnout",     icon: "battery-charging", category: "hazard", description: "Reduces manager XP" },
  fakeAgent:  { points: -120, color: "#FFA844", label: "Fake Agent",  icon: "user-x",         category: "hazard",   description: "One reward becomes essence" },
};

// Wave-based weights (seconds 0-20)
function weightsForElapsed(elapsedMs: number, hazardMult: number): Record<ObjectKind, number> {
  const t = elapsedMs / 1000;
  // Defaults
  const w: Record<ObjectKind, number> = {
    shard: 32,
    shardRole: 16,
    trait: 8,
    coin: 18,
    catalyst: 4,
    golden: 1,
    comboOrb: 6,
    scoutIntel: 3,
    physio: 3,
    morale: 3,
    trap: 6,
    injury: 3,
    burnout: 2,
    fakeAgent: 2,
  };

  if (t < 5) {
    // warmup — easier, fewer hazards, no rare jackpots yet
    w.trap *= 0.4;
    w.injury *= 0.3;
    w.burnout = 0.5;
    w.fakeAgent = 0.5;
    w.golden = 0;
    w.catalyst *= 0.4;
  } else if (t < 12) {
    // dense & varied — normal weights, slight hazard bump
    w.trap *= 1.1;
    w.injury *= 1.0;
  } else if (t < 18) {
    // high intensity — more hazards, more rares
    w.trap *= 1.3;
    w.injury *= 1.4;
    w.burnout *= 1.4;
    w.catalyst *= 1.6;
    w.trait *= 1.3;
    w.golden = 2;
  } else {
    // climax / jackpot
    w.golden = 6;
    w.catalyst *= 2.5;
    w.trait *= 1.6;
    w.trap *= 1.5;
    w.injury *= 1.8;
  }

  // Apply hazard multiplier from tuning
  w.trap *= hazardMult;
  w.injury *= hazardMult;
  w.burnout *= hazardMult;
  w.fakeAgent *= hazardMult;

  return w;
}

export function rollObject(elapsedMs: number, hazardMult = 1): ObjectKind {
  const w = weightsForElapsed(elapsedMs, hazardMult);
  let total = 0;
  for (const k of Object.keys(w) as ObjectKind[]) total += w[k];
  let r = Math.random() * total;
  for (const k of Object.keys(w) as ObjectKind[]) {
    r -= w[k];
    if (r <= 0) return k;
  }
  return "shard";
}

export function rewardFromCount(
  counts: Record<ObjectKind, number>,
  multiplierPeak: number,
): SlashReward {
  const reward: SlashReward = {
    coins: 0,
    shards: 0,
    roleShards: [],
    traitFragments: 0,
    catalysts: 0,
    essence: 0,
    injuries: counts.injury || 0,
    burnouts: counts.burnout || 0,
    fakeAgents: counts.fakeAgent || 0,
    moraleDelta: (counts.morale || 0) * 6 - (counts.trap || 0) * 4 - (counts.burnout || 0) * 5,
    physioCount: counts.physio || 0,
    scoutIntelRole: null,
  };

  reward.shards = counts.shard;
  reward.coins = counts.coin * 25 + counts.golden * 200;
  reward.traitFragments = counts.trait + counts.golden;
  reward.catalysts = counts.catalyst + (counts.golden > 0 ? 1 : 0);
  reward.essence = Math.floor(counts.shard / 4) + (counts.fakeAgent || 0) * 2;

  const roleCount = counts.shardRole || 0;
  if (roleCount > 0) {
    for (let i = 0; i < roleCount; i++) {
      const role = ROLES[Math.floor(Math.random() * ROLES.length)]!;
      const existing = reward.roleShards.find((r) => r.role === role);
      if (existing) existing.amount++;
      else reward.roleShards.push({ role, amount: 1 });
    }
  }

  if ((counts.scoutIntel || 0) > 0) {
    reward.scoutIntelRole = ROLES[Math.floor(Math.random() * ROLES.length)]!;
  }

  // Combo multiplier on coins
  const bonus = Math.max(1, multiplierPeak / 2);
  reward.coins = Math.round(reward.coins * bonus);
  return reward;
}

export function comboTier(combo: number): { name: string; color: string; tier: number } {
  if (combo >= 15) return { name: "GODLIKE", color: "#FFE066", tier: 4 };
  if (combo >= 10) return { name: "UNSTOPPABLE", color: "#B36BFF", tier: 3 };
  if (combo >= 6)  return { name: "ON FIRE",     color: "#FF6B4A", tier: 2 };
  if (combo >= 3)  return { name: "HOT",         color: "#FFD60A", tier: 1 };
  return { name: "", color: "#888", tier: 0 };
}
