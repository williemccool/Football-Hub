import type { ObjectKind, Role, SlashReward } from "./types";

const ROLES: Role[] = ["GK", "CB", "FB", "DM", "CM", "AM", "WG", "ST"];

export const OBJECT_CONFIG: Record<
  ObjectKind,
  { weight: number; points: number; color: string; label: string; icon: string }
> = {
  shard:     { weight: 35, points: 100, color: "#00FF88", label: "Shard",       icon: "diamond" },
  shardRole: { weight: 18, points: 140, color: "#41D7FF", label: "Role Shard",  icon: "shield" },
  trait:     { weight: 10, points: 200, color: "#B36BFF", label: "Trait",       icon: "flame" },
  coin:      { weight: 22, points: 75,  color: "#FFD60A", label: "Coins",       icon: "ellipse" },
  catalyst:  { weight: 5,  points: 350, color: "#FF8A3D", label: "Catalyst",    icon: "flash" },
  golden:    { weight: 2,  points: 500, color: "#FFE066", label: "Golden Pack", icon: "star" },
  trap:      { weight: 8,  points: -300, color: "#FF3B5C", label: "Trap",       icon: "close-circle" },
};

export function rollObject(): ObjectKind {
  const total = Object.values(OBJECT_CONFIG).reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const [k, cfg] of Object.entries(OBJECT_CONFIG)) {
    r -= cfg.weight;
    if (r <= 0) return k as ObjectKind;
  }
  return "shard";
}

export function rewardFromCount(counts: Record<ObjectKind, number>, multiplierPeak: number): SlashReward {
  const reward: SlashReward = {
    coins: 0,
    shards: 0,
    roleShards: [],
    traitFragments: 0,
    catalysts: 0,
    essence: 0,
  };
  reward.shards = counts.shard;
  reward.coins = counts.coin * 25 + counts.golden * 200;
  reward.traitFragments = counts.trait + counts.golden;
  reward.catalysts = counts.catalyst + (counts.golden > 0 ? 1 : 0);
  reward.essence = Math.max(0, counts.trap * -1) + Math.floor(counts.shard / 4);

  // Role shards distributed
  const roleCount = counts.shardRole;
  if (roleCount > 0) {
    for (let i = 0; i < roleCount; i++) {
      const role = ROLES[Math.floor(Math.random() * ROLES.length)]!;
      const existing = reward.roleShards.find((r) => r.role === role);
      if (existing) existing.amount++;
      else reward.roleShards.push({ role, amount: 1 });
    }
  }

  // Combo multiplier bonus on coins/shards
  const bonus = Math.max(1, multiplierPeak / 2);
  reward.coins = Math.round(reward.coins * bonus);
  return reward;
}
