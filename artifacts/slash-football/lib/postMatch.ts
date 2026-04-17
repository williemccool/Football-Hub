import type { GameState, MatchAnalysis, MatchEvent, Player } from "./types";

interface TeamRatings {
  attack: number;
  midfield: number;
  defense: number;
}

export function analyzeMatch(
  state: GameState,
  homeRatings: TeamRatings,
  awayRatings: TeamRatings,
  events: MatchEvent[],
  homeScore: number,
  awayScore: number,
): MatchAnalysis {
  const lineupPlayers = state.lineup
    .map((id) => state.players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  // Goals/saves/chances per side
  const homeGoals = events.filter((e) => e.kind === "goal").length;
  const awayGoals = events.filter((e) => e.kind === "concede").length;
  const homeChances = events.filter((e) => e.team === "home" && (e.kind === "chance" || e.kind === "save")).length;
  const awayChances = events.filter((e) => e.team === "away" && (e.kind === "chance" || e.kind === "save")).length;
  const homeBigChances = homeGoals + Math.floor(homeChances * 0.3);
  const awayBigChances = awayGoals + Math.floor(awayChances * 0.3);

  // Possession proxy from midfield rating
  const midDiff = homeRatings.midfield - awayRatings.midfield;
  const possession = Math.round(50 + Math.max(-15, Math.min(15, midDiff)));

  // Strongest player: if any home goalscorer, take last; else top attacker by rating
  const goalScorers = events.filter((e) => e.kind === "goal" && e.player).map((e) => e.player!);
  let strongest: string | null = null;
  if (goalScorers.length > 0) {
    strongest = goalScorers[goalScorers.length - 1] ?? null;
  } else if (lineupPlayers.length > 0) {
    const top = [...lineupPlayers].sort((a, b) => b.rating - a.rating)[0]!;
    strongest = top.name;
  }

  // Weakest area
  const aDiff = awayRatings.attack - homeRatings.defense;
  const mDiff = awayRatings.midfield - homeRatings.midfield;
  const dDiff = homeRatings.attack - awayRatings.defense;
  const weakestArea: MatchAnalysis["weakestArea"] =
    aDiff > Math.max(mDiff * -1, dDiff * -1) && aDiff > 0
      ? "Defense"
      : mDiff > 4
      ? "Midfield"
      : dDiff < -4
      ? "Attack"
      : null;

  // Verdict
  let verdict: string;
  if (homeScore > awayScore) {
    if (homeScore - awayScore >= 3) verdict = "Dominant performance — your unit clicked at every level.";
    else if (homeBigChances > awayBigChances) verdict = "A deserved win built on creating better chances.";
    else verdict = "A grind, but you took the win.";
  } else if (homeScore === awayScore) {
    verdict = homeBigChances > awayBigChances
      ? "Frustrating draw — you should have closed it out."
      : "A fair point in a balanced match.";
  } else {
    if (awayScore - homeScore >= 3) verdict = "Heavy defeat — they cut you open repeatedly.";
    else if (awayBigChances <= homeBigChances) verdict = "Cruel result — your finishing let you down.";
    else verdict = "Outplayed in key moments.";
  }

  // Tactical note based on tactics & ratings
  const tacticalNote = (() => {
    if (state.pressing === "High" && state.tempo === "Fast") {
      return "High pressing at fast tempo drained stamina — late chances suffered.";
    }
    if (state.style === "Defensive" && awayChances > homeChances) {
      return "Sitting back invited pressure your back line couldn't always absorb.";
    }
    if (state.style === "Attacking" && awayGoals > homeGoals) {
      return "Attacking shape left your midfield exposed on transitions.";
    }
    if (midDiff < -4) {
      return "Your midfield was overrun — they controlled possession through the middle.";
    }
    if (state.pressing === "Low" && awayChances > 4) {
      return "Low press let them build freely from the back.";
    }
    return "Balanced shape held up reasonably across the 90.";
  })();

  // Suggestion
  const suggestion = (() => {
    if (weakestArea === "Defense") return "Train a center-back or sign a stronger CB to firm up the back line.";
    if (weakestArea === "Midfield") return "Boost your midfield ratings or switch to higher pressing to choke their build-up.";
    if (weakestArea === "Attack") return "Upgrade your forwards — finishing and creativity were lacking.";
    if (state.pressing === "High" && state.tempo === "Fast") return "Try Medium pressing to preserve stamina late.";
    if (homeScore === 0) return "Forge a Clinical Finisher trait on your top striker.";
    return "Keep grinding scout runs to deepen your squad rotation.";
  })();

  return {
    verdict,
    strongestPlayer: strongest,
    weakestArea,
    tacticalNote,
    suggestion,
    homeStats: { possession, shots: homeChances + homeGoals, bigChances: homeBigChances },
    awayStats: { possession: 100 - possession, shots: awayChances + awayGoals, bigChances: awayBigChances },
  };
}
