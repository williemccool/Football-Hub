import { createSeason } from "./league";
import type { GameState, Player, Rarity, Role, TuningConfig } from "./types";

const FIRST_NAMES = [
  "Luca", "Marco", "Diego", "Kai", "Noah", "Theo", "Jude", "Rio", "Eden",
  "Mateo", "Hugo", "Aleix", "Yusuf", "Sami", "Dimi", "Ari", "Cole", "Vito",
  "Niko", "Renz", "Akin", "Pep", "Felix", "Otto",
];
const LAST_NAMES = [
  "Vance", "Nakai", "Soriano", "Dietrich", "Okafor", "Bellandi", "Park",
  "Costa", "Reyes", "Holt", "Volkov", "Ito", "Kane", "Aliu", "Rashford",
  "Bashir", "Morgan", "Tanaka", "Vlahov", "Marin", "Quintero",
];
const NATIONS = ["ARG", "BRA", "ESP", "ENG", "FRA", "GER", "JPN", "POR", "NED", "ITA", "NGA", "MEX"];
const ARCHETYPES: Record<Role, string[]> = {
  GK: ["Sweeper", "Shot-Stopper"],
  CB: ["Anchor", "Ball-Playing"],
  FB: ["Overlapper", "Inverted"],
  DM: ["Destroyer", "Regista"],
  CM: ["Box-to-Box", "Playmaker"],
  AM: ["Trequartista", "Shadow"],
  WG: ["Inside Forward", "Pure Winger"],
  ST: ["Poacher", "Target", "False 9"],
};
const TRAITS = [
  "Clinical Finisher", "Late Runner", "Press Trigger", "Long Ball Specialist",
  "Box Defender", "Agile Dribbler", "Big Match Composure",
];

let idCounter = 1;
function genId() {
  return `p${idCounter++}_${Math.random().toString(36).slice(2, 7)}`;
}

function pick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function rarityFromRating(r: number): Rarity {
  if (r >= 80) return "Epic";
  if (r >= 75) return "Rare";
  if (r >= 70) return "Uncommon";
  return "Common";
}

export function makePlayer(role: Role, ratingMin: number, ratingMax: number): Player {
  const rating = Math.floor(ratingMin + Math.random() * (ratingMax - ratingMin + 1));
  const ceiling = Math.min(92, rating + 6 + Math.floor(Math.random() * 8));
  const baseStats = {
    pace: rating + Math.floor(Math.random() * 8) - 4,
    passing: rating + Math.floor(Math.random() * 8) - 4,
    shooting: rating + Math.floor(Math.random() * 8) - 4,
    control: rating + Math.floor(Math.random() * 8) - 4,
    defense: rating + Math.floor(Math.random() * 8) - 4,
    physical: rating + Math.floor(Math.random() * 8) - 4,
  };
  if (role === "ST" || role === "WG") baseStats.shooting += 4;
  if (role === "CB" || role === "FB") baseStats.defense += 5;
  if (role === "GK") {
    baseStats.defense = rating + 8;
    baseStats.shooting = 30;
  }
  if (role === "DM" || role === "CM") baseStats.passing += 3;

  Object.keys(baseStats).forEach((k) => {
    const key = k as keyof typeof baseStats;
    baseStats[key] = Math.max(30, Math.min(99, baseStats[key]));
  });

  return {
    id: genId(),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    nationality: pick(NATIONS),
    age: 17 + Math.floor(Math.random() * 14),
    role,
    archetype: pick(ARCHETYPES[role]),
    rating,
    ceiling,
    level: 1,
    xp: 0,
    rarity: rarityFromRating(rating),
    shards: 0,
    shardsToNext: 8,
    trait: null,
    condition: 100,
    injuredMatches: 0,
    stats: baseStats,
  };
}

const STARTER_FORMATION_4_3_3: Role[] = [
  "GK", "FB", "CB", "CB", "FB", "DM", "CM", "AM", "WG", "ST", "WG",
];

export function defaultTuning(): TuningConfig {
  return {
    ticketCap: 5,
    ticketRefillMs: 90 * 60 * 1000,
    spawnDensity: 1.0,
    hazardChance: 1.0,
    injuryChance: 0.5,
    moraleHitValue: 8,
    shardsToFirstUpgrade: 8,
    duplicateCoinValue: 60,
    matchCoinWin: 200,
    matchCoinDraw: 100,
    leagueSize: 8,
    seasonChampionReward: 1500,
  };
}

export function createInitialState(): GameState {
  idCounter = 1;
  const startingEleven: Player[] = STARTER_FORMATION_4_3_3.map((role) =>
    makePlayer(role, 64, 71)
  );
  const bench: Player[] = [
    makePlayer("GK", 60, 66),
    makePlayer("CB", 62, 68),
    makePlayer("CM", 64, 70),
    makePlayer("WG", 64, 70),
    makePlayer("ST", 65, 71),
  ];
  const star = makePlayer("AM", 76, 79);
  star.trait = pick(TRAITS);
  startingEleven[7] = star;

  const players = [...startingEleven, ...bench];
  const tuning = defaultTuning();
  const season = createSeason("FC Slash", tuning.leagueSize, 1);

  return {
    manager: "Coach",
    clubName: "FC Slash",
    managerLevel: 1,
    managerXp: 0,
    seasonXp: 0,
    coins: 250,
    gems: 80,
    essence: 0,
    traitFragments: 2,
    catalysts: 0,
    morale: 70,
    injuryShield: false,
    scoutIntelRole: null,
    tickets: tuning.ticketCap,
    maxTickets: tuning.ticketCap,
    lastTicketRefill: Date.now(),
    ticketRefillMs: tuning.ticketRefillMs,
    players,
    lineup: startingEleven.map((p) => p.id),
    formation: "4-3-3",
    style: "Balanced",
    pressing: "Medium",
    tempo: "Normal",
    results: [],
    upcomingOpponent: pickOpponent(),
    dailyMissions: [
      { id: "m1", text: "Complete 3 scout runs", progress: 0, target: 3, reward: 100, done: false, claimed: false },
      { id: "m2", text: "Score 1500+ in a slash run", progress: 0, target: 1500, reward: 75, done: false, claimed: false },
      { id: "m3", text: "Play 1 fixture", progress: 0, target: 1, reward: 150, done: false, claimed: false },
      { id: "m4", text: "Hit a 6+ combo", progress: 0, target: 6, reward: 60, done: false, claimed: false },
    ],
    season,
    tuning,
    bestSlashScore: 0,
    totalSlashRuns: 0,
    championships: 0,
    cosmetics: { owned: [], equipped: {} },
    seasonPass: { premiumOwned: false, claimedFree: [], claimedPremium: [] },
  };
}

const OPPONENTS = [
  "Northgate Rovers", "Real Vista", "Atlético Iron", "Solstice United",
  "Crowncliffe FC", "Drakehaven", "Veridian SC", "Hollow Bay",
];

export function pickOpponent(): { name: string; rating: number } {
  const name = pick(OPPONENTS);
  const rating = 66 + Math.floor(Math.random() * 8);
  return { name, rating };
}

export const TRAIT_LIST = TRAITS;
