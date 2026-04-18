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
  condition: number; // 0-100, drains from injuries / matches
  injuredMatches: number; // > 0 means unavailable for that many fixtures
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
  | "golden"
  | "comboOrb"
  | "scoutIntel"
  | "physio"
  | "morale"
  // hazards
  | "trap"
  | "injury"
  | "burnout"
  | "fakeAgent";

export type MotionKind = "drop" | "heavy" | "fast" | "angled" | "curved" | "precise";

export interface SlashReward {
  coins: number;
  shards: number;
  roleShards: { role: Role; amount: number }[];
  traitFragments: number;
  catalysts: number;
  essence: number;
  // event consequences
  injuries: number;
  burnouts: number;
  fakeAgents: number;
  moraleDelta: number;
  physioCount: number;
  scoutIntelRole: Role | null;
  newPlayerRoll?: { rolled: boolean; ratingFloor: number };
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

export interface MatchAnalysis {
  verdict: string;
  strongestPlayer: string | null;
  weakestArea: "Attack" | "Midfield" | "Defense" | null;
  tacticalNote: string;
  suggestion: string;
  homeStats: { possession: number; shots: number; bigChances: number };
  awayStats: { possession: number; shots: number; bigChances: number };
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
  matchday?: number;
  analysis?: MatchAnalysis;
  injured?: { id: string; name: string; matches: number } | null;
}

export interface LeagueClub {
  id: string;
  name: string;
  rating: number;
  isPlayer: boolean;
}

export interface Standing {
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: ("W" | "D" | "L")[]; // last 5
}

export interface ScheduledFixture {
  matchday: number;
  homeId: string;
  awayId: string;
  played: boolean;
  homeScore?: number;
  awayScore?: number;
}

export interface Season {
  number: number;
  matchday: number; // current matchday (1-based)
  totalMatchdays: number;
  clubs: LeagueClub[];
  standings: Standing[];
  schedule: ScheduledFixture[];
  finished: boolean;
}

export interface DailyMission {
  id: string;
  text: string;
  progress: number;
  target: number;
  reward: number;
  done: boolean;
  claimed: boolean;
}

export interface TuningConfig {
  ticketCap: number;
  ticketRefillMs: number;
  spawnDensity: number; // multiplier
  hazardChance: number; // 0..1 multiplier
  injuryChance: number; // chance an injury hazard actually injures
  moraleHitValue: number;
  shardsToFirstUpgrade: number;
  duplicateCoinValue: number;
  matchCoinWin: number;
  matchCoinDraw: number;
  leagueSize: number;
  seasonChampionReward: number;
}

export interface CosmeticsState {
  /** Owned cosmetic ids. */
  owned: string[];
  /** Equipped cosmetic id per category (kit, crest, …). */
  equipped: { [category: string]: string };
}

export interface SeasonPassState {
  /** True once the player owns this season's premium track. */
  premiumOwned: boolean;
  /** Tier numbers already claimed on the free track. */
  claimedFree: number[];
  /** Tier numbers already claimed on the premium track. */
  claimedPremium: number[];
}

export interface GameState {
  manager: string;
  clubName: string;
  managerLevel: number;
  managerXp: number;
  seasonXp: number;
  coins: number;
  /** Premium cosmetic-only currency. NEVER spent on progression. */
  gems: number;
  essence: number;
  traitFragments: number;
  catalysts: number;
  morale: number; // 0-100, club-wide
  injuryShield: boolean; // physio token next-injury prevention
  scoutIntelRole: Role | null;
  tickets: number;
  maxTickets: number;
  lastTicketRefill: number;
  ticketRefillMs: number;
  players: Player[];
  lineup: string[];
  formation: "4-3-3" | "4-4-2" | "3-5-2";
  style: "Balanced" | "Attacking" | "Defensive";
  pressing: "Low" | "Medium" | "High";
  tempo: "Slow" | "Normal" | "Fast";
  results: MatchResult[];
  upcomingOpponent: { name: string; rating: number };
  dailyMissions: DailyMission[];
  season: Season;
  tuning: TuningConfig;
  bestSlashScore: number;
  totalSlashRuns: number;
  championships: number;
  cosmetics: CosmeticsState;
  seasonPass: SeasonPassState;
}
