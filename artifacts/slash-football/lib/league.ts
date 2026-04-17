import type { LeagueClub, ScheduledFixture, Season, Standing } from "./types";

const NPC_CLUB_NAMES = [
  "Northgate Rovers",
  "Real Vista",
  "Atlético Iron",
  "Solstice United",
  "Crowncliffe FC",
  "Drakehaven",
  "Veridian SC",
  "Hollow Bay",
  "Steel Harbor",
  "Black Sun FC",
  "Aurora Athletic",
];

export function generateLeague(playerClubName: string, size = 8): LeagueClub[] {
  const clubs: LeagueClub[] = [
    { id: "player", name: playerClubName, rating: 68, isPlayer: true },
  ];
  const shuffled = [...NPC_CLUB_NAMES].sort(() => Math.random() - 0.5).slice(0, size - 1);
  shuffled.forEach((name, i) => {
    // spread ratings 64..78
    const rating = 64 + Math.floor(((i + 1) / size) * 14);
    clubs.push({ id: `npc${i + 1}`, name, rating: rating + Math.floor(Math.random() * 4) - 2, isPlayer: false });
  });
  return clubs;
}

// Round-robin (single) using circle method. For an even number of teams,
// produces (n-1) matchdays each with n/2 fixtures. We then mirror for double.
export function generateSchedule(clubs: LeagueClub[], double = true): ScheduledFixture[] {
  const ids = clubs.map((c) => c.id);
  const n = ids.length;
  if (n % 2 !== 0) ids.push("BYE");
  const total = ids.length;
  const rounds = total - 1;
  const half = total / 2;

  const arr = [...ids];
  const fixtures: ScheduledFixture[] = [];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i]!;
      const away = arr[total - 1 - i]!;
      if (home !== "BYE" && away !== "BYE") {
        fixtures.push({
          matchday: r + 1,
          homeId: r % 2 === 0 ? home : away,
          awayId: r % 2 === 0 ? away : home,
          played: false,
        });
      }
    }
    // rotate (fix first, rotate rest)
    const fixed = arr[0]!;
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  if (double) {
    const mirror = fixtures.map((f) => ({
      matchday: f.matchday + rounds,
      homeId: f.awayId,
      awayId: f.homeId,
      played: false,
    }));
    return [...fixtures, ...mirror];
  }
  return fixtures;
}

export function emptyStandings(clubs: LeagueClub[]): Standing[] {
  return clubs.map((c) => ({
    clubId: c.id,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    form: [],
  }));
}

export function createSeason(playerClubName: string, size = 8, seasonNumber = 1): Season {
  const clubs = generateLeague(playerClubName, size);
  const schedule = generateSchedule(clubs, true);
  const totalMatchdays = Math.max(...schedule.map((f) => f.matchday));
  return {
    number: seasonNumber,
    matchday: 1,
    totalMatchdays,
    clubs,
    standings: emptyStandings(clubs),
    schedule,
    finished: false,
  };
}

export function findPlayerFixture(season: Season): ScheduledFixture | null {
  const f = season.schedule.find(
    (f) => f.matchday === season.matchday && (f.homeId === "player" || f.awayId === "player") && !f.played,
  );
  return f ?? null;
}

export function applyResult(
  season: Season,
  fixture: ScheduledFixture,
  homeScore: number,
  awayScore: number,
): Season {
  const next: Season = {
    ...season,
    schedule: season.schedule.map((f) =>
      f === fixture ? { ...f, played: true, homeScore, awayScore } : f,
    ),
    standings: season.standings.map((s) => ({ ...s, form: [...s.form] })),
  };
  const update = (clubId: string, gf: number, ga: number) => {
    const st = next.standings.find((s) => s.clubId === clubId);
    if (!st) return;
    st.played++;
    st.goalsFor += gf;
    st.goalsAgainst += ga;
    if (gf > ga) {
      st.wins++;
      st.points += 3;
      st.form.push("W");
    } else if (gf === ga) {
      st.draws++;
      st.points += 1;
      st.form.push("D");
    } else {
      st.losses++;
      st.form.push("L");
    }
    if (st.form.length > 5) st.form = st.form.slice(-5);
  };
  update(fixture.homeId, homeScore, awayScore);
  update(fixture.awayId, awayScore, homeScore);
  return next;
}

export function simulateOtherFixtures(season: Season, currentMatchday: number): Season {
  let updated = season;
  for (const f of updated.schedule) {
    if (f.matchday !== currentMatchday) continue;
    if (f.played) continue;
    if (f.homeId === "player" || f.awayId === "player") continue;
    const home = updated.clubs.find((c) => c.id === f.homeId)!;
    const away = updated.clubs.find((c) => c.id === f.awayId)!;
    const homeAdv = 2;
    const diff = home.rating + homeAdv - away.rating;
    // expected goals based on rating diff
    const lambdaH = Math.max(0.3, 1.4 + diff * 0.05);
    const lambdaA = Math.max(0.3, 1.2 - diff * 0.05);
    const hs = poisson(lambdaH);
    const as = poisson(lambdaA);
    updated = applyResult(updated, f, hs, as);
  }
  return updated;
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  while (true) {
    k++;
    p *= Math.random();
    if (p <= L) return Math.min(7, k - 1);
  }
}

export function sortStandings(standings: Standing[]): Standing[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

export function getOpponentForMatchday(season: Season): { name: string; rating: number; isHome: boolean } | null {
  const f = findPlayerFixture(season);
  if (!f) return null;
  const playerIsHome = f.homeId === "player";
  const oppId = playerIsHome ? f.awayId : f.homeId;
  const opp = season.clubs.find((c) => c.id === oppId);
  if (!opp) return null;
  return { name: opp.name, rating: opp.rating, isHome: playerIsHome };
}
