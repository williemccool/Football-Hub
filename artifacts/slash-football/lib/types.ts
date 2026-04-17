export type Role = "GK" | "CB" | "FB" | "DM" | "CM" | "AM" | "WG" | "ST";
export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface Player {
  id: string;
  name: string;
  nationality: string;
  age: number;
  role: Role;
  archetype: string;
  rating: number;
  ceiling: number;
  level: number;
  xp: number;
  rarity: Rarity;
  shards: number;
  shardsToNext: number;
  trait: string | null;
  stats: {
    pace: number;
    passing: number;
    shooting: number;
    control: number;
    defense: number;
    physical: number;
  };
}

export type ObjectKind =
  | "shard"
  | "shardRole"
  | "trait"
  | "coin"
  | "catalyst"
  | "trap"
  | "golden";

export interface SlashReward {
  coins: number;
  shards: number;
  roleShards: { role: Role; amount: number }[];
  traitFragments: number;
  catalysts: number;
  essence: number;
}

export type MatchEventKind =
  | "kickoff"
  | "goal"
  | "concede"
  | "save"
  | "chance"
  | "yellow"
  | "red"
  | "halftime"
  | "fulltime";

export interface MatchEvent {
  minute: number;
  team: "home" | "away";
  kind: MatchEventKind;
  player?: string;
  text: string;
}

export interface MatchResult {
  id: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  ratingHome: number;
  ratingAway: number;
  rewards: { coins: number; xp: number };
  playedAt: number;
}

export interface GameState {
  manager: string;
  clubName: string;
  managerLevel: number;
  managerXp: number;
  coins: number;
  essence: number;
  traitFragments: number;
  catalysts: number;
  tickets: number;
  maxTickets: number;
  lastTicketRefill: number;
  ticketRefillMs: number;
  players: Player[];
  lineup: string[]; // 11 player ids; "" for empty slot
  formation: "4-3-3" | "4-4-2" | "3-5-2";
  style: "Balanced" | "Attacking" | "Defensive";
  pressing: "Low" | "Medium" | "High";
  tempo: "Slow" | "Normal" | "Fast";
  results: MatchResult[];
  upcomingOpponent: { name: string; rating: number };
  dailyMissions: {
    id: string;
    text: string;
    progress: number;
    target: number;
    reward: number;
    done: boolean;
  }[];
}
