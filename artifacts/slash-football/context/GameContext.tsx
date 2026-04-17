import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { simulateMatch, nextOpponent } from "@/lib/matchSim";
import { createInitialState, makePlayer, TRAIT_LIST } from "@/lib/seedData";
import type { GameState, MatchResult, Player, Role, SlashReward } from "@/lib/types";

const STORAGE_KEY = "slashfootball.state.v1";

type Ctx = {
  state: GameState;
  loading: boolean;
  reset: () => Promise<void>;
  spendTicket: () => boolean;
  applySlashReward: (reward: SlashReward, runScore: number) => Player | null;
  upgradePlayer: (id: string) => boolean;
  unlockTrait: (id: string) => boolean;
  setLineupSlot: (slotIndex: number, playerId: string | null) => void;
  setTactics: (
    partial: Partial<Pick<GameState, "formation" | "style" | "pressing" | "tempo">>,
  ) => void;
  playFixture: () => MatchResult;
  refillTicketsIfDue: () => void;
  msUntilNextTicket: () => number;
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
          // Shallow merge with defaults so missing keys from older saves don't crash gameplay
          const merged: GameState = {
            ...defaults,
            ...parsed,
            players: Array.isArray(parsed?.players) && parsed.players.length > 0 ? parsed.players : defaults.players,
            lineup: Array.isArray(parsed?.lineup) ? parsed.lineup : defaults.lineup,
            results: Array.isArray(parsed?.results) ? parsed.results : [],
            dailyMissions: Array.isArray(parsed?.dailyMissions) && parsed.dailyMissions.length > 0
              ? parsed.dailyMissions
              : defaults.dailyMissions,
            upcomingOpponent: parsed?.upcomingOpponent ?? defaults.upcomingOpponent,
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
      const next = { ...s, tickets: s.tickets - 1 };
      if (s.tickets === s.maxTickets) {
        next.lastTicketRefill = Date.now();
      }
      return next;
    });
    return ok;
  }, []);

  const applySlashReward = useCallback(
    (reward: SlashReward, runScore: number): Player | null => {
      let createdPlayer: Player | null = null;
      setState((s) => {
        const next = clone(s);
        next.coins += reward.coins;
        next.essence += reward.essence;
        next.traitFragments += reward.traitFragments;
        next.catalysts += reward.catalysts;

        // Apply generic shards: distribute to a random under-leveled player.
        let remainingShards = reward.shards;
        // Apply role shards to matching role players first
        for (const rs of reward.roleShards) {
          const candidates = next.players.filter((p) => p.role === rs.role);
          let amt = rs.amount;
          while (amt-- > 0 && candidates.length > 0) {
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
        // generic shards: pick lowest rated player to nudge up
        while (remainingShards-- > 0) {
          const sortable = [...next.players].sort((a, b) => a.rating - b.rating);
          const target = sortable[0]!;
          target.shards += 1;
          if (target.shards >= target.shardsToNext && target.rating < target.ceiling) {
            target.shards = 0;
            target.shardsToNext = Math.min(20, target.shardsToNext + 2);
            target.rating += 1;
            target.level += 1;
          }
        }

        // Score-based bonus: high score gives a chance for a new prospect
        if (runScore > 2500 && Math.random() < 0.35) {
          const role = ROLES[Math.floor(Math.random() * ROLES.length)]!;
          const ratingBoost = Math.min(8, Math.floor(runScore / 1000));
          const np = makePlayer(role, 64 + ratingBoost - 4, 64 + ratingBoost + 2);
          next.players.push(np);
          createdPlayer = np;
        }

        // Daily missions
        next.dailyMissions = next.dailyMissions.map((m) => {
          if (m.done) return m;
          if (m.id === "m1") {
            const p = m.progress + 1;
            if (p >= m.target) {
              next.coins += m.reward;
              return { ...m, progress: m.target, done: true };
            }
            return { ...m, progress: p };
          }
          if (m.id === "m2" && runScore >= m.target) {
            next.coins += m.reward;
            return { ...m, progress: m.target, done: true };
          }
          return m;
        });

        next.managerXp += Math.floor(runScore / 100);
        while (next.managerXp >= next.managerLevel * 200) {
          next.managerXp -= next.managerLevel * 200;
          next.managerLevel += 1;
        }
        return next;
      });
      return createdPlayer;
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
      // small stat bumps
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
      // Swap if player is already in lineup somewhere
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
      const r = simulateMatch(s, s.upcomingOpponent.rating, s.upcomingOpponent.name);
      result = r;
      const next = clone(s);
      next.results = [r, ...next.results].slice(0, 20);
      next.coins += r.rewards.coins;
      next.managerXp += r.rewards.xp;
      while (next.managerXp >= next.managerLevel * 200) {
        next.managerXp -= next.managerLevel * 200;
        next.managerLevel += 1;
      }
      next.upcomingOpponent = nextOpponent();
      next.dailyMissions = next.dailyMissions.map((m) => {
        if (m.done) return m;
        if (m.id === "m3") {
          next.coins += m.reward;
          return { ...m, progress: m.target, done: true };
        }
        return m;
      });
      return next;
    });
    return result!;
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
    ],
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
