import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  applyResult,
  createSeason,
  findPlayerFixture,
  getOpponentForMatchday,
  simulateOtherFixtures,
  sortStandings,
} from "@/lib/league";
import { simulateMatch, nextOpponent } from "@/lib/matchSim";
import { createInitialState, defaultTuning, makePlayer, TRAIT_LIST } from "@/lib/seedData";
import type { GameState, MatchResult, Player, Role, SlashReward, TuningConfig } from "@/lib/types";

const STORAGE_KEY = "slashfootball.state.v2";

type Ctx = {
  state: GameState;
  loading: boolean;
  reset: () => Promise<void>;
  spendTicket: () => boolean;
  applySlashReward: (reward: SlashReward, runScore: number, peakCombo: number) => {
    newPlayer: Player | null;
    injuredPlayer: Player | null;
    moraleDelta: number;
  };
  upgradePlayer: (id: string) => boolean;
  unlockTrait: (id: string) => boolean;
  setLineupSlot: (slotIndex: number, playerId: string | null) => void;
  setTactics: (
    partial: Partial<Pick<GameState, "formation" | "style" | "pressing" | "tempo">>,
  ) => void;
  playFixture: () => MatchResult;
  refillTicketsIfDue: () => void;
  msUntilNextTicket: () => number;
  claimMission: (id: string) => boolean;
  salvagePlayer: (id: string) => boolean;
  updateTuning: (partial: Partial<TuningConfig>) => void;
  startNewSeason: () => void;
};

const GameCtx = createContext<Ctx | null>(null);

const ROLES: Role[] = ["GK", "CB", "FB", "DM", "CM", "AM", "WG", "ST"];

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const defaults = createInitialState();
          // Deep-ish merge so older saves still load.
          const merged: GameState = {
            ...defaults,
            ...parsed,
            tuning: { ...defaults.tuning, ...(parsed?.tuning ?? {}) },
            season: parsed?.season && parsed.season.schedule?.length > 0 ? parsed.season : defaults.season,
            players: Array.isArray(parsed?.players) && parsed.players.length > 0
              ? parsed.players.map((p: Player) => ({
                  condition: 100,
                  injuredMatches: 0,
                  ...p,
                }))
              : defaults.players,
            lineup: Array.isArray(parsed?.lineup) ? parsed.lineup : defaults.lineup,
            results: Array.isArray(parsed?.results) ? parsed.results : [],
            dailyMissions: Array.isArray(parsed?.dailyMissions) && parsed.dailyMissions.length > 0
              ? parsed.dailyMissions.map((m: any) => ({ claimed: false, ...m }))
              : defaults.dailyMissions,
            upcomingOpponent: parsed?.upcomingOpponent ?? defaults.upcomingOpponent,
            morale: typeof parsed?.morale === "number" ? parsed.morale : defaults.morale,
            injuryShield: !!parsed?.injuryShield,
            scoutIntelRole: parsed?.scoutIntelRole ?? null,
            seasonXp: parsed?.seasonXp ?? 0,
            bestSlashScore: parsed?.bestSlashScore ?? 0,
            totalSlashRuns: parsed?.totalSlashRuns ?? 0,
            championships: parsed?.championships ?? 0,
          };
          setState(merged);
        }
      } catch (e) {
        console.warn("load state", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loading]);

  const refillTicketsIfDue = useCallback(() => {
    setState((s) => {
      if (s.tickets >= s.maxTickets) {
        return { ...s, lastTicketRefill: Date.now() };
      }
      const elapsed = Date.now() - s.lastTicketRefill;
      const gained = Math.floor(elapsed / s.ticketRefillMs);
      if (gained <= 0) return s;
      const newTickets = Math.min(s.maxTickets, s.tickets + gained);
      return {
        ...s,
        tickets: newTickets,
        lastTicketRefill: s.lastTicketRefill + gained * s.ticketRefillMs,
      };
    });
  }, []);

  useEffect(() => {
    refillTicketsIfDue();
    const i = setInterval(refillTicketsIfDue, 30 * 1000);
    return () => clearInterval(i);
  }, [refillTicketsIfDue]);

  const msUntilNextTicket = useCallback(() => {
    if (state.tickets >= state.maxTickets) return 0;
    const elapsed = Date.now() - state.lastTicketRefill;
    return Math.max(0, state.ticketRefillMs - elapsed);
  }, [state.tickets, state.maxTickets, state.lastTicketRefill, state.ticketRefillMs]);

  const reset = useCallback(async () => {
    const fresh = createInitialState();
    setState(fresh);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const spendTicket = useCallback((): boolean => {
    let ok = false;
    setState((s) => {
      if (s.tickets <= 0) return s;
      ok = true;
      const next = { ...s, tickets: s.tickets - 1, totalSlashRuns: s.totalSlashRuns + 1 };
      if (s.tickets === s.maxTickets) {
        next.lastTicketRefill = Date.now();
      }
      return next;
    });
    return ok;
  }, []);

  const applySlashReward = useCallback(
    (reward: SlashReward, runScore: number, peakCombo: number) => {
      let createdPlayer: Player | null = null;
      let injuredPlayer: Player | null = null;
      let moraleDelta = 0;
      setState((s) => {
        const next = clone(s);
        next.coins += reward.coins;
        next.essence += reward.essence;
        next.traitFragments += reward.traitFragments;
        next.catalysts += reward.catalysts;

        // Scout intel sets next role focus
        if (reward.scoutIntelRole) {
          next.scoutIntelRole = reward.scoutIntelRole;
        }
        // If scoutIntel was previously set, push extra role shards toward it
        const focusRole = next.scoutIntelRole;

        // Role shards
        for (const rs of reward.roleShards) {
          let amt = rs.amount;
          while (amt-- > 0) {
            const candidates = next.players.filter((p) => p.role === rs.role);
            if (candidates.length === 0) break;
            const target = candidates[Math.floor(Math.random() * candidates.length)]!;
            target.shards += 1;
            if (target.shards >= target.shardsToNext && target.rating < target.ceiling) {
              target.shards = 0;
              target.shardsToNext = Math.min(20, target.shardsToNext + 2);
              target.rating += 1;
              target.level += 1;
            }
          }
        }

        // Generic shards: prefer focus role if set, else lowest rated player
        let remainingShards = reward.shards;
        while (remainingShards-- > 0) {
          let target: Player | undefined;
          if (focusRole) {
            const focused = next.players.filter((p) => p.role === focusRole);
            if (focused.length > 0) {
              target = [...focused].sort((a, b) => a.rating - b.rating)[0];
            }
          }
          if (!target) {
            target = [...next.players].sort((a, b) => a.rating - b.rating)[0];
          }
          if (!target) break;
          target.shards += 1;
          if (target.shards >= target.shardsToNext && target.rating < target.ceiling) {
            target.shards = 0;
            target.shardsToNext = Math.min(20, target.shardsToNext + 2);
            target.rating += 1;
            target.level += 1;
          }
        }
        // Consume scout intel after applying
        if (reward.shards > 0 && focusRole && !reward.scoutIntelRole) {
          next.scoutIntelRole = null;
        }

        // Morale
        const moraleBefore = next.morale;
        next.morale = Math.max(0, Math.min(100, next.morale + reward.moraleDelta));
        moraleDelta = next.morale - moraleBefore;

        // Physio: heal one injured player or grant shield
        for (let i = 0; i < reward.physioCount; i++) {
          const injured = next.players.find((p) => p.injuredMatches > 0);
          if (injured) {
            injured.injuredMatches = 0;
            injured.condition = Math.min(100, injured.condition + 30);
          } else {
            next.injuryShield = true;
          }
        }

        // Burnouts: drain manager XP
        if (reward.burnouts > 0) {
          next.managerXp = Math.max(0, next.managerXp - reward.burnouts * 30);
        }

        // Fake agent: convert some catalysts/traitFrags to essence
        for (let i = 0; i < reward.fakeAgents; i++) {
          if (next.traitFragments > 0) {
            next.traitFragments -= 1;
            next.essence += 1;
          } else if (next.catalysts > 0) {
            next.catalysts -= 1;
            next.essence += 2;
          } else if (next.coins >= 30) {
            next.coins -= 30;
            next.essence += 1;
          }
        }

        // Injuries: chance per injury hazard
        for (let i = 0; i < reward.injuries; i++) {
          if (next.injuryShield) {
            next.injuryShield = false;
            continue;
          }
          if (Math.random() < next.tuning.injuryChance) {
            const lineupIds = next.lineup.filter(Boolean);
            if (lineupIds.length === 0) break;
            const targetId = lineupIds[Math.floor(Math.random() * lineupIds.length)]!;
            const target = next.players.find((p) => p.id === targetId);
            if (target && target.injuredMatches <= 0) {
              target.injuredMatches = 1 + Math.floor(Math.random() * 2);
              target.condition = Math.max(20, target.condition - 35);
              injuredPlayer = target;
            }
          }
        }

        // Score-based new prospect
        if (runScore > 2500 && Math.random() < 0.35) {
          const role = ROLES[Math.floor(Math.random() * ROLES.length)]!;
          const ratingBoost = Math.min(8, Math.floor(runScore / 1000));
          const np = makePlayer(role, 64 + ratingBoost - 4, 64 + ratingBoost + 2);
          // Duplicate-style: if already 25 players, salvage instead
          if (next.players.length >= 25) {
            next.coins += next.tuning.duplicateCoinValue;
            next.essence += 3;
            createdPlayer = null;
          } else {
            next.players.push(np);
            createdPlayer = np;
          }
        }

        // Daily missions
        next.dailyMissions = next.dailyMissions.map((m) => {
          if (m.done) return m;
          if (m.id === "m1") {
            const p = m.progress + 1;
            if (p >= m.target) return { ...m, progress: m.target, done: true };
            return { ...m, progress: p };
          }
          if (m.id === "m2" && runScore >= m.target) {
            return { ...m, progress: m.target, done: true };
          }
          if (m.id === "m4" && peakCombo >= m.target) {
            return { ...m, progress: peakCombo, done: true };
          }
          return m;
        });

        // Track best slash
        if (runScore > next.bestSlashScore) next.bestSlashScore = runScore;

        // Manager XP from run
        next.managerXp += Math.floor(runScore / 100);
        next.seasonXp += Math.floor(runScore / 80);
        while (next.managerXp >= next.managerLevel * 200) {
          next.managerXp -= next.managerLevel * 200;
          next.managerLevel += 1;
        }
        return next;
      });
      return { newPlayer: createdPlayer, injuredPlayer, moraleDelta };
    },
    [],
  );

  const upgradePlayer = useCallback((id: string): boolean => {
    let ok = false;
    setState((s) => {
      const next = clone(s);
      const p = next.players.find((pp) => pp.id === id);
      if (!p) return s;
      if (p.rating >= p.ceiling) return s;
      const cost = 50 + (p.rating - 60) * 12;
      if (next.coins < cost) return s;
      next.coins -= cost;
      p.rating += 1;
      p.level += 1;
      const keys = ["pace", "passing", "shooting", "control", "defense", "physical"] as const;
      const k = keys[Math.floor(Math.random() * keys.length)]!;
      p.stats[k] = Math.min(99, p.stats[k] + 2);
      ok = true;
      return next;
    });
    return ok;
  }, []);

  const unlockTrait = useCallback((id: string): boolean => {
    let ok = false;
    setState((s) => {
      const next = clone(s);
      const p = next.players.find((pp) => pp.id === id);
      if (!p) return s;
      if (p.trait) return s;
      const cost = 3;
      if (next.traitFragments < cost) return s;
      next.traitFragments -= cost;
      const t = TRAIT_LIST[Math.floor(Math.random() * TRAIT_LIST.length)]!;
      p.trait = t;
      ok = true;
      return next;
    });
    return ok;
  }, []);

  const setLineupSlot = useCallback((slotIndex: number, playerId: string | null) => {
    setState((s) => {
      const lineup = [...s.lineup];
      if (playerId) {
        const existingIdx = lineup.indexOf(playerId);
        if (existingIdx !== -1) {
          lineup[existingIdx] = lineup[slotIndex] ?? "";
        }
      }
      lineup[slotIndex] = playerId ?? "";
      return { ...s, lineup };
    });
  }, []);

  const setTactics = useCallback(
    (partial: Partial<Pick<GameState, "formation" | "style" | "pressing" | "tempo">>) => {
      setState((s) => ({ ...s, ...partial }));
    },
    [],
  );

  const playFixture = useCallback((): MatchResult => {
    let result: MatchResult | null = null;
    setState((s) => {
      // Determine opponent from season schedule, fallback to upcomingOpponent
      let opponent = getOpponentForMatchday(s.season);
      if (!opponent) {
        opponent = { name: s.upcomingOpponent.name, rating: s.upcomingOpponent.rating, isHome: true };
      }
      const r = simulateMatch(s, opponent.rating, opponent.name);
      r.matchday = s.season.matchday;
      result = r;
      const next = clone(s) as GameState;

      // Update season standings: simulate other matches first then apply player result
      const playerFixture = findPlayerFixture(next.season);
      if (playerFixture) {
        // Simulate others
        next.season = simulateOtherFixtures(next.season, next.season.matchday);
        // Apply player result
        const playerIsHome = playerFixture.homeId === "player";
        const homeScore = playerIsHome ? r.homeScore : r.awayScore;
        const awayScore = playerIsHome ? r.awayScore : r.homeScore;
        next.season = applyResult(next.season, playerFixture, homeScore, awayScore);
        next.season = { ...next.season, matchday: next.season.matchday + 1 };
        if (next.season.matchday > next.season.totalMatchdays) {
          // Season finished
          const sorted = sortStandings(next.season.standings);
          const championId = sorted[0]?.clubId;
          if (championId === "player") {
            next.coins += next.tuning.seasonChampionReward;
            next.championships += 1;
          } else {
            next.coins += Math.floor(next.tuning.seasonChampionReward / 4);
          }
          next.season = { ...next.season, finished: true };
        }
      }

      // Decrement injuries (player squad recovery)
      next.players = next.players.map((p) => {
        const condRecover = Math.min(100, p.condition + 8);
        return {
          ...p,
          condition: condRecover,
          injuredMatches: Math.max(0, p.injuredMatches - 1),
        };
      });

      // Drain condition slightly for the lineup (heavy game)
      next.players = next.players.map((p) =>
        next.lineup.includes(p.id) ? { ...p, condition: Math.max(40, p.condition - 12) } : p,
      );

      // Morale shift
      if (r.homeScore > r.awayScore) next.morale = Math.min(100, next.morale + 6);
      else if (r.homeScore === r.awayScore) next.morale = Math.min(100, next.morale + 1);
      else next.morale = Math.max(0, next.morale - 5);

      next.results = [r, ...next.results].slice(0, 30);
      next.coins += r.rewards.coins;
      next.managerXp += r.rewards.xp;
      next.seasonXp += r.rewards.xp;
      while (next.managerXp >= next.managerLevel * 200) {
        next.managerXp -= next.managerLevel * 200;
        next.managerLevel += 1;
      }

      // Update upcomingOpponent from new schedule
      const nextOpp = getOpponentForMatchday(next.season);
      if (nextOpp) next.upcomingOpponent = { name: nextOpp.name, rating: nextOpp.rating };
      else next.upcomingOpponent = nextOpponent();

      next.dailyMissions = next.dailyMissions.map((m) => {
        if (m.done) return m;
        if (m.id === "m3") return { ...m, progress: m.target, done: true };
        return m;
      });
      return next;
    });
    return result!;
  }, []);

  const claimMission = useCallback((id: string): boolean => {
    let ok = false;
    setState((s) => {
      const next = clone(s);
      const m = next.dailyMissions.find((mm) => mm.id === id);
      if (!m || !m.done || m.claimed) return s;
      m.claimed = true;
      next.coins += m.reward;
      ok = true;
      return next;
    });
    return ok;
  }, []);

  const salvagePlayer = useCallback((id: string): boolean => {
    let ok = false;
    setState((s) => {
      // Don't allow salvaging lineup players
      if (s.lineup.includes(id)) return s;
      const p = s.players.find((pp) => pp.id === id);
      if (!p) return s;
      const coinValue = s.tuning.duplicateCoinValue + (p.rating - 60) * 4;
      const essenceValue = 2 + Math.floor(p.rating / 10);
      ok = true;
      return {
        ...s,
        coins: s.coins + coinValue,
        essence: s.essence + essenceValue,
        traitFragments: s.traitFragments + (p.trait ? 1 : 0),
        players: s.players.filter((pp) => pp.id !== id),
      };
    });
    return ok;
  }, []);

  const updateTuning = useCallback((partial: Partial<TuningConfig>) => {
    setState((s) => {
      const next = clone(s);
      next.tuning = { ...defaultTuning(), ...next.tuning, ...partial };
      // Sync derived state
      if (partial.ticketCap !== undefined) {
        next.maxTickets = partial.ticketCap;
        next.tickets = Math.min(next.tickets, partial.ticketCap);
      }
      if (partial.ticketRefillMs !== undefined) {
        next.ticketRefillMs = partial.ticketRefillMs;
      }
      return next;
    });
  }, []);

  const startNewSeason = useCallback(() => {
    setState((s) => {
      const next = clone(s) as GameState;
      const newSeason = createSeason(next.clubName, next.tuning.leagueSize, next.season.number + 1);
      next.season = newSeason;
      const opp = getOpponentForMatchday(newSeason);
      if (opp) next.upcomingOpponent = { name: opp.name, rating: opp.rating };
      next.seasonXp = 0;
      // Reset daily missions
      next.dailyMissions = next.dailyMissions.map((m) => ({
        ...m,
        progress: 0,
        done: false,
        claimed: false,
      }));
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      loading,
      reset,
      spendTicket,
      applySlashReward,
      upgradePlayer,
      unlockTrait,
      setLineupSlot,
      setTactics,
      playFixture,
      refillTicketsIfDue,
      msUntilNextTicket,
      claimMission,
      salvagePlayer,
      updateTuning,
      startNewSeason,
    }),
    [
      state,
      loading,
      reset,
      spendTicket,
      applySlashReward,
      upgradePlayer,
      unlockTrait,
      setLineupSlot,
      setTactics,
      playFixture,
      refillTicketsIfDue,
      msUntilNextTicket,
      claimMission,
      salvagePlayer,
      updateTuning,
      startNewSeason,
    ],
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
