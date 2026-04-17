import type { GameState, MatchEvent, MatchResult, Player } from "./types";
import { pickOpponent } from "./seedData";

function teamRating(players: Player[], style: GameState["style"]): {
  attack: number;
  midfield: number;
  defense: number;
  overall: number;
} {
  if (players.length === 0) return { attack: 50, midfield: 50, defense: 50, overall: 50 };
  const att = players.filter((p) => ["ST", "WG", "AM"].includes(p.role));
  const mid = players.filter((p) => ["CM", "DM", "AM"].includes(p.role));
  const def = players.filter((p) => ["CB", "FB", "GK"].includes(p.role));
  const avg = (arr: Player[], k: keyof Player["stats"]) =>
    arr.length === 0 ? 60 : arr.reduce((s, p) => s + p.stats[k], 0) / arr.length;
  let attack = (avg(att, "shooting") + avg(att, "pace")) / 2;
  let midfield = avg(mid, "passing");
  let defense = avg(def, "defense");
  if (style === "Attacking") {
    attack += 4;
    defense -= 3;
  } else if (style === "Defensive") {
    defense += 4;
    attack -= 3;
  }
  return {
    attack,
    midfield,
    defense,
    overall: (attack + midfield + defense) / 3,
  };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const COMMENTARY = {
  goal: [
    "rifles it into the top corner!",
    "slots it past the keeper!",
    "buries it from the edge of the box!",
    "thunderous strike — and it's in!",
    "tap-in after a brilliant cutback!",
  ],
  save: [
    "denied by a stunning save!",
    "the keeper pushes it wide!",
    "great reflex stop!",
  ],
  chance: [
    "wide of the post!",
    "good chance, just over the bar.",
    "blocked at the last moment.",
  ],
  yellow: ["picks up a yellow card.", "booked for a late tackle."],
  red: ["sent off! Down to ten."],
};

function pickC(arr: string[], r: () => number) {
  return arr[Math.floor(r() * arr.length)]!;
}

export function simulateMatch(
  state: GameState,
  opponentRating: number,
  opponentName: string,
): MatchResult {
  const lineupPlayers = state.lineup
    .map((id) => state.players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const home = teamRating(lineupPlayers, state.style);
  // Build a synthetic away team rating
  const away = {
    attack: opponentRating + (Math.random() * 6 - 3),
    midfield: opponentRating + (Math.random() * 6 - 3),
    defense: opponentRating + (Math.random() * 6 - 3),
    overall: opponentRating,
  };

  const seed = Math.floor(Math.random() * 1e9);
  const rand = rng(seed);
  const events: MatchEvent[] = [];
  events.push({ minute: 0, team: "home", kind: "kickoff", text: "Kickoff." });

  const attackers = lineupPlayers.filter((p) => ["ST", "WG", "AM", "CM"].includes(p.role));
  let homeScore = 0;
  let awayScore = 0;

  for (let m = 5; m <= 90; m += 5) {
    if (m === 45) {
      events.push({
        minute: 45,
        team: "home",
        kind: "halftime",
        text: `Halftime: ${state.clubName} ${homeScore} – ${awayScore} ${opponentName}`,
      });
      continue;
    }
    // Chance probability proportional to attack vs defense
    const homeChance = (home.attack + home.midfield * 0.5) / (home.attack + home.midfield + away.defense + 50);
    const awayChance = (away.attack + away.midfield * 0.5) / (away.attack + away.midfield + home.defense + 50);

    if (rand() < homeChance * 0.18) {
      // Goal/save chance for home
      const conv = (home.attack + 60) / 200;
      const player = attackers.length > 0 ? attackers[Math.floor(rand() * attackers.length)]! : lineupPlayers[10];
      const pName = player ? player.name : "Striker";
      if (rand() < conv) {
        homeScore++;
        events.push({
          minute: m,
          team: "home",
          kind: "goal",
          player: pName,
          text: `${m}' GOAL — ${pName} ${pickC(COMMENTARY.goal, rand)}`,
        });
      } else if (rand() < 0.5) {
        events.push({
          minute: m,
          team: "home",
          kind: "save",
          player: pName,
          text: `${m}' ${pName} ${pickC(COMMENTARY.save, rand)}`,
        });
      } else {
        events.push({
          minute: m,
          team: "home",
          kind: "chance",
          player: pName,
          text: `${m}' ${pName} — ${pickC(COMMENTARY.chance, rand)}`,
        });
      }
    } else if (rand() < awayChance * 0.18) {
      const conv = (away.attack + 60) / 200;
      if (rand() < conv) {
        awayScore++;
        events.push({
          minute: m,
          team: "away",
          kind: "concede",
          text: `${m}' ${opponentName} score — ${pickC(COMMENTARY.goal, rand)}`,
        });
      } else {
        events.push({
          minute: m,
          team: "away",
          kind: "chance",
          text: `${m}' ${opponentName} ${pickC(COMMENTARY.chance, rand)}`,
        });
      }
    }

    if (rand() < 0.04) {
      const team: "home" | "away" = rand() < 0.5 ? "home" : "away";
      const isRed = rand() < 0.1;
      const playerName = team === "home" && lineupPlayers.length > 0
        ? lineupPlayers[Math.floor(rand() * lineupPlayers.length)]!.name
        : opponentName;
      events.push({
        minute: m,
        team,
        kind: isRed ? "red" : "yellow",
        player: playerName,
        text: `${m}' ${playerName} ${isRed ? pickC(COMMENTARY.red, rand) : pickC(COMMENTARY.yellow, rand)}`,
      });
    }
  }

  events.push({
    minute: 90,
    team: "home",
    kind: "fulltime",
    text: `Fulltime: ${state.clubName} ${homeScore} – ${awayScore} ${opponentName}`,
  });

  const win = homeScore > awayScore;
  const draw = homeScore === awayScore;
  const coins = win ? 200 : draw ? 100 : 50;
  const xp = win ? 50 : draw ? 25 : 10;

  return {
    id: `match_${Date.now()}`,
    opponent: opponentName,
    homeScore,
    awayScore,
    events,
    ratingHome: Math.round(home.overall),
    ratingAway: Math.round(away.overall),
    rewards: { coins, xp },
    playedAt: Date.now(),
  };
}

export function nextOpponent() {
  return pickOpponent();
}
