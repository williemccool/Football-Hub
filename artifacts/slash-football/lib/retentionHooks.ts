import type { GameState } from "./types";
import { sortStandings } from "./league";

/**
 * Pure derivations of "what should the player do next" used by the hub
 * next-action banner and the notification reminder snapshot.
 */

export interface NextAction {
  id: string;
  title: string;
  body: string;
  route: string;
  cta: string;
  severity: "info" | "success" | "warning";
}

export interface DerivedHooks {
  affordableUpgrades: number;
  unclaimedRewards: number;
  injuredCount: number;
  lineupCount: number;
  ticketsFull: boolean;
  matchdayReady: boolean;
  seasonEndingSoon: boolean;
  tablePosition: number;
  tablePositionDelta: number;
  primary: NextAction | null;
}

function upgradeCost(rating: number): number {
  return 50 + (rating - 60) * 12;
}

export function deriveHooks(state: GameState, prevTablePosition: number | null): DerivedHooks {
  const lineupCount = state.lineup.filter(Boolean).length;
  const injuredCount = state.players.filter((p) => p.injuredMatches > 0).length;
  const ticketsFull = state.tickets >= state.maxTickets;
  const matchday = state.season.matchday;
  const totalMatchdays = state.season.totalMatchdays;
  const matchdayReady = !state.season.finished && matchday <= totalMatchdays;
  const seasonEndingSoon =
    !state.season.finished && totalMatchdays - matchday <= 2 && matchday <= totalMatchdays;

  let affordable = 0;
  for (const p of state.players) {
    if (p.rating >= p.ceiling) continue;
    if (state.coins >= upgradeCost(p.rating)) affordable++;
  }

  const unclaimedRewards = state.dailyMissions.filter((m) => m.done && !m.claimed).length;
  const sorted = sortStandings(state.season.standings);
  const playerIdx = sorted.findIndex((s) => s.clubId === "player");
  const tablePosition = playerIdx >= 0 ? playerIdx + 1 : 0;
  const tablePositionDelta =
    prevTablePosition && tablePosition ? prevTablePosition - tablePosition : 0;

  // Pick the most important "next action" using a small priority ladder.
  let primary: NextAction | null = null;
  if (lineupCount < 11) {
    primary = {
      id: "complete_lineup",
      title: "Complete your lineup",
      body: `${11 - lineupCount} of 11 starting slots are empty. Fill them before kickoff.`,
      route: "/lineup",
      cta: "Open lineup",
      severity: "warning",
    };
  } else if (unclaimedRewards > 0) {
    primary = {
      id: "claim_rewards",
      title: `${unclaimedRewards} reward${unclaimedRewards === 1 ? "" : "s"} to claim`,
      body: "Daily objectives are ready. Tap to collect coins.",
      route: "/",
      cta: "Claim rewards",
      severity: "success",
    };
  } else if (matchdayReady) {
    primary = {
      id: "play_matchday",
      title: `Matchday ${matchday} is ready`,
      body: state.upcomingOpponent.name
        ? `Face ${state.upcomingOpponent.name} (${state.upcomingOpponent.rating} OVR).`
        : "Your fixture is ready to play.",
      route: "/match",
      cta: "Play match",
      severity: "info",
    };
  } else if (ticketsFull) {
    primary = {
      id: "burn_tickets",
      title: "Tickets are full",
      body: "Slash a run before more refills are wasted.",
      route: "/scout",
      cta: "Start slash",
      severity: "info",
    };
  } else if (affordable > 0) {
    primary = {
      id: "upgrade_player",
      title: `${affordable} upgrade${affordable === 1 ? "" : "s"} available`,
      body: "You have the coins to push a player to the next rating.",
      route: "/(tabs)/squad",
      cta: "Open squad",
      severity: "success",
    };
  } else if (injuredCount > 0) {
    primary = {
      id: "manage_injuries",
      title: `${injuredCount} player${injuredCount === 1 ? "" : "s"} injured`,
      body: "Rotate your lineup so they recover before the next fixture.",
      route: "/lineup",
      cta: "Adjust lineup",
      severity: "warning",
    };
  }

  return {
    affordableUpgrades: affordable,
    unclaimedRewards,
    injuredCount,
    lineupCount,
    ticketsFull,
    matchdayReady,
    seasonEndingSoon,
    tablePosition,
    tablePositionDelta,
    primary,
  };
}
