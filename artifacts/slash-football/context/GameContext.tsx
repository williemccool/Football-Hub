import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getBundle, getCosmetic, priceForPreset } from "@/lib/cosmetics";
import { applyGenerosity, PASS_TIERS, type PassReward } from "@/lib/seasonPass";
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
import { analytics, flags, objectStorage, sync } from "@/services";
import type {
  GameState,
  MatchResult,
  Player,
  Role,
  SlashReward,
  TuningConfig,
} from "@/lib/types";

export type SalvageMode = "coins" | "essence" | "evolution";

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
  salvagePlayer: (id: string, mode?: SalvageMode) => boolean;
  updateTuning: (partial: Partial<TuningConfig>) => void;
  startNewSeason: () => void;
  // Monetization actions
  addGems: (amount: number, reason?: string) => void;
  purchaseCosmetic: (
    id: string,
  ) => { ok: true } | { ok: false; reason: "already_owned" | "insufficient_funds" | "not_found" };
  purchaseBundle: (
    id: string,
  ) =>
    | { ok: true }
    | { ok: false; reason: "insufficient_funds" | "not_found" | "already_owned" };
  equipCosmetic: (id: string) => boolean;
  claimPassReward: (tier: number, track: "free" | "premium") =>
    | { ok: true; reward: PassReward }
    | { ok: false; reason: "locked" | "already_claimed" | "no_reward" | "premium_required" };
  purchasePassPremium: () => boolean;
};

const GameCtx = createContext<Ctx | null>(null);

const ROLES: Role[] = ["GK", "CB", "FB", "DM", "CM", "AM", "WG", "ST"];

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function hydrateFromLoaded(loaded: GameState | null): GameState {
  const defaults = createInitialState();
  if (!loaded) return defaults;
  return {
    ...defaults,
    ...loaded,
    tuning: { ...defaults.tuning, ...(loaded?.tuning ?? {}) },
    season:
      loaded?.season && loaded.season.schedule?.length > 0
        ? loaded.season
        : defaults.season,
    players:
      Array.isArray(loaded?.players) && loaded.players.length > 0
        ? loaded.players.map((p: Player) => ({
            condition: 100,
            injuredMatches: 0,
            ...(p as object),
          } as Player))
        : defaults.players,
    lineup: Array.isArray(loaded?.lineup) ? loaded.lineup : defaults.lineup,
    results: Array.isArray(loaded?.results) ? loaded.results : [],
    dailyMissions:
      Array.isArray(loaded?.dailyMissions) && loaded.dailyMissions.length > 0
        ? loaded.dailyMissions.map((m: any) => ({ claimed: false, ...m }))
        : defaults.dailyMissions,
    upcomingOpponent: loaded?.upcomingOpponent ?? defaults.upcomingOpponent,
    morale: typeof loaded?.morale === "number" ? loaded.morale : defaults.morale,
    injuryShield: !!loaded?.injuryShield,
    scoutIntelRole: loaded?.scoutIntelRole ?? null,
    seasonXp: loaded?.seasonXp ?? 0,
    bestSlashScore: loaded?.bestSlashScore ?? 0,
    totalSlashRuns: loaded?.totalSlashRuns ?? 0,
    championships: loaded?.championships ?? 0,
    gems: typeof loaded?.gems === "number" ? loaded.gems : defaults.gems,
    cosmetics: {
      owned: Array.isArray(loaded?.cosmetics?.owned) ? loaded.cosmetics.owned : [],
      equipped:
        loaded?.cosmetics?.equipped && typeof loaded.cosmetics.equipped === "object"
          ? loaded.cosmetics.equipped
          : {},
    },
    seasonPass: {
      premiumOwned: !!loaded?.seasonPass?.premiumOwned,
      claimedFree: Array.isArray(loaded?.seasonPass?.claimedFree)
        ? loaded.seasonPass.claimedFree
        : [],
      claimedPremium: Array.isArray(loaded?.seasonPass?.claimedPremium)
        ? loaded.seasonPass.claimedPremium
        : [],
    },
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await sync.loadInitial();
        if (loaded) setState(hydrateFromLoaded(loaded));
      } catch (e) {
        console.warn("load state", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // React to server-authoritative state pulled after a 409 conflict.
  useEffect(() => {
    const off = sync.subscribe((snap) => {
      if (snap.serverState) {
        const fresh = sync.consumeServerState();
        if (fresh) setState(hydrateFromLoaded(fresh));
      }
    });
    return off;
  }, []);

  useEffect(() => {
    if (loading) return;
    // Local cache write + debounced backend push, both via the sync service.
    sync.push(state).catch(() => {});
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
    await sync.clearAll();
    // Re-establish a fresh user/sync identity so subsequent pushes have a
    // userId again. clearAll() sets internal userId to null; loadInitial()
    // re-runs auth.getOrCreateUserId().
    await sync.loadInitial();
    setState(fresh);
    await sync.push(fresh);
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
    if (ok) analytics.track("slash_run_started");
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
      const scoreBand =
        runScore < 500 ? "low" : runScore < 1500 ? "mid" : runScore < 3000 ? "high" : "elite";
      analytics.track("slash_run_completed", { runScore, peakCombo, scoreBand });
      analytics.track("slash_run_score", { runScore, scoreBand });
      analytics.track("slash_reward_claimed", {
        coins: reward.coins,
        essence: reward.essence,
        shards: reward.shards,
        injuries: reward.injuries,
      });
      if (createdPlayer) {
        analytics.track("player_unlocked", {
          rarity: (createdPlayer as Player).rarity,
          rating: (createdPlayer as Player).rating,
          role: (createdPlayer as Player).role,
        });
      }
      return { newPlayer: createdPlayer, injuredPlayer, moraleDelta };
    },
    [],
  );

  const upgradePlayer = useCallback((id: string): boolean => {
    let ok = false;
    let newRating = 0;
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
      newRating = p.rating;
      ok = true;
      return next;
    });
    if (ok) analytics.track("player_upgraded", { newRating });
    return ok;
  }, []);

  const unlockTrait = useCallback((id: string): boolean => {
    let ok = false;
    let traitName: string | null = null;
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
      traitName = t;
      ok = true;
      return next;
    });
    if (ok) analytics.track("trait_forged", { trait: traitName });
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
    analytics.track("lineup_updated", { slotIndex, hasPlayer: !!playerId });
  }, []);

  const setTactics = useCallback(
    (partial: Partial<Pick<GameState, "formation" | "style" | "pressing" | "tempo">>) => {
      setState((s) => ({ ...s, ...partial }));
      analytics.track("tactics_updated", partial as Record<string, unknown>);
    },
    [],
  );

  const playFixture = useCallback((): MatchResult => {
    let result: MatchResult | null = null;
    analytics.track("match_started");
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

      // Persist replay payload via portable object storage abstraction.
      // Fire-and-forget — never block gameplay on this.
      objectStorage
        .putReplay(`replay_${r.id}`, {
          id: r.id,
          opponent: r.opponent,
          homeScore: r.homeScore,
          awayScore: r.awayScore,
          events: r.events,
          analysis: r.analysis,
          playedAt: r.playedAt,
        })
        .catch(() => {});

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
    if (result) {
      const r = result as MatchResult;
      const outcome =
        r.homeScore > r.awayScore ? "win" : r.homeScore === r.awayScore ? "draw" : "loss";
      analytics.track("match_completed", {
        outcome,
        homeScore: r.homeScore,
        awayScore: r.awayScore,
        opponent: r.opponent,
      });
    }
    return result!;
  }, []);

  const claimMission = useCallback((id: string): boolean => {
    let ok = false;
    let reward = 0;
    setState((s) => {
      const next = clone(s);
      const m = next.dailyMissions.find((mm) => mm.id === id);
      if (!m || !m.done || m.claimed) return s;
      m.claimed = true;
      next.coins += m.reward;
      reward = m.reward;
      ok = true;
      return next;
    });
    if (ok) analytics.track("daily_objective_claimed", { id, reward });
    return ok;
  }, []);

  const salvagePlayer = useCallback((id: string, mode: SalvageMode = "coins"): boolean => {
    let ok = false;
    setState((s) => {
      // Don't allow salvaging lineup players
      if (s.lineup.includes(id)) return s;
      const p = s.players.find((pp) => pp.id === id);
      if (!p) return s;
      const baseCoin = s.tuning.duplicateCoinValue + (p.rating - 60) * 4;
      const baseEss = 2 + Math.floor(p.rating / 10);
      ok = true;
      const next = { ...s, players: s.players.filter((pp) => pp.id !== id) };
      const traitRefund = p.trait ? 1 : 0;
      if (mode === "essence") {
        return {
          ...next,
          coins: s.coins + Math.floor(baseCoin * 0.4),
          essence: s.essence + Math.round(baseEss * 2.2),
          traitFragments: s.traitFragments + traitRefund,
        };
      }
      if (mode === "evolution") {
        // Apply value to a same-role candidate as shards + a small catalyst chance.
        const candidates = s.players.filter(
          (pp) => pp.role === p.role && pp.id !== p.id && pp.rating < pp.ceiling,
        );
        const target = candidates.sort((a, b) => b.rating - a.rating)[0];
        const evolved = next.players.map((pp) => {
          if (target && pp.id === target.id) {
            const shardsGain = 4 + Math.floor(p.rating / 12);
            let shards = pp.shards + shardsGain;
            let rating = pp.rating;
            let level = pp.level;
            let shardsToNext = pp.shardsToNext;
            while (shards >= shardsToNext && rating < pp.ceiling) {
              shards -= shardsToNext;
              shardsToNext = Math.min(20, shardsToNext + 2);
              rating += 1;
              level += 1;
            }
            return { ...pp, shards, shardsToNext, rating, level };
          }
          return pp;
        });
        return {
          ...next,
          players: evolved,
          coins: s.coins + Math.floor(baseCoin * 0.5),
          catalysts: s.catalysts + (Math.random() < 0.25 ? 1 : 0),
          traitFragments: s.traitFragments + traitRefund,
        };
      }
      // default: quick sell -> higher coin output
      return {
        ...next,
        coins: s.coins + Math.round(baseCoin * 1.4),
        essence: s.essence + Math.floor(baseEss * 0.5),
        traitFragments: s.traitFragments + traitRefund,
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

  const addGems = useCallback((amount: number, reason?: string) => {
    if (amount === 0) return;
    setState((s) => ({ ...s, gems: Math.max(0, s.gems + amount) }));
    if (reason) {
      // Bookkept under the existing reward event so admin dashboards can group it.
      analytics.track("slash_reward_claimed", {
        coins: 0,
        essence: 0,
        shards: 0,
        injuries: 0,
        gems: amount,
        gemReason: reason,
      });
    }
  }, []);

  const purchaseCosmetic = useCallback(
    (id: string):
      | { ok: true }
      | { ok: false; reason: "already_owned" | "insufficient_funds" | "not_found" } => {
      const item = getCosmetic(id);
      if (!item || item.passOnly) {
        analytics.track("cosmetic_purchase_attempted", {
          id,
          outcome: "not_found",
        });
        return { ok: false, reason: "not_found" };
      }
      const presetRaw = flags.variant("cosmetic_pricing_preset") as
        | "default"
        | "soft_launch"
        | "promo";
      const adjusted = priceForPreset(item.price, presetRaw ?? "default");
      let result:
        | { ok: true }
        | { ok: false; reason: "already_owned" | "insufficient_funds" } = {
        ok: false,
        reason: "insufficient_funds",
      };
      setState((s) => {
        if (s.cosmetics.owned.includes(id)) {
          result = { ok: false, reason: "already_owned" };
          return s;
        }
        const cur = adjusted.currency;
        const balance = cur === "gems" ? s.gems : s.coins;
        if (balance < adjusted.amount) {
          result = { ok: false, reason: "insufficient_funds" };
          return s;
        }
        result = { ok: true };
        const next: GameState = {
          ...s,
          cosmetics: {
            ...s.cosmetics,
            owned: [...s.cosmetics.owned, id],
          },
        };
        if (cur === "gems") next.gems = s.gems - adjusted.amount;
        else next.coins = s.coins - adjusted.amount;
        return next;
      });
      analytics.track("cosmetic_purchase_attempted", {
        id,
        category: item.category,
        currency: adjusted.currency,
        amount: adjusted.amount,
        pricingPreset: presetRaw,
        outcome: result.ok ? "success" : result.reason,
      });
      return result;
    },
    [],
  );

  const purchaseBundle = useCallback(
    (id: string):
      | { ok: true }
      | { ok: false; reason: "insufficient_funds" | "not_found" | "already_owned" } => {
      const bundle = getBundle(id);
      if (!bundle) return { ok: false, reason: "not_found" };
      const presetRaw = flags.variant("cosmetic_pricing_preset") as
        | "default"
        | "soft_launch"
        | "promo";
      const adjusted = priceForPreset(bundle.price, presetRaw ?? "default");
      let result:
        | { ok: true }
        | { ok: false; reason: "insufficient_funds" | "already_owned" } = {
        ok: false,
        reason: "insufficient_funds",
      };
      setState((s) => {
        const ownedSet = new Set(s.cosmetics.owned);
        const fullyOwned = bundle.itemIds.every((iid) => ownedSet.has(iid));
        if (fullyOwned) {
          result = { ok: false, reason: "already_owned" };
          return s;
        }
        const cur = adjusted.currency;
        const balance = cur === "gems" ? s.gems : s.coins;
        if (balance < adjusted.amount) {
          result = { ok: false, reason: "insufficient_funds" };
          return s;
        }
        result = { ok: true };
        for (const itemId of bundle.itemIds) ownedSet.add(itemId);
        const next: GameState = {
          ...s,
          cosmetics: { ...s.cosmetics, owned: [...ownedSet] },
        };
        if (cur === "gems") next.gems = s.gems - adjusted.amount;
        else next.coins = s.coins - adjusted.amount;
        return next;
      });
      analytics.track("cosmetic_purchase_attempted", {
        id,
        bundle: true,
        currency: adjusted.currency,
        amount: adjusted.amount,
        pricingPreset: presetRaw,
        outcome: result.ok ? "success" : result.reason,
      });
      return result;
    },
    [],
  );

  const equipCosmetic = useCallback((id: string): boolean => {
    const item = getCosmetic(id);
    if (!item) return false;
    let ok = false;
    setState((s) => {
      if (!s.cosmetics.owned.includes(id)) return s;
      ok = true;
      return {
        ...s,
        cosmetics: {
          ...s.cosmetics,
          equipped: { ...s.cosmetics.equipped, [item.category]: id },
        },
      };
    });
    if (ok) analytics.track("cosmetic_equipped", { id, category: item.category });
    return ok;
  }, []);

  const claimPassReward = useCallback(
    (tier: number, track: "free" | "premium"):
      | { ok: true; reward: PassReward }
      | { ok: false; reason: "locked" | "already_claimed" | "no_reward" | "premium_required" } => {
      const def = PASS_TIERS[tier - 1];
      if (!def) return { ok: false, reason: "no_reward" };
      const rawReward = track === "free" ? def.freeReward : def.premiumReward;
      if (!rawReward) return { ok: false, reason: "no_reward" };
      const generosity = (flags.variant("pass_reward_generosity") as
        | "lean"
        | "default"
        | "generous") ?? "default";
      const reward = applyGenerosity(rawReward, generosity);
      let outcome:
        | { ok: true; reward: PassReward }
        | { ok: false; reason: "locked" | "already_claimed" | "premium_required" } = {
        ok: false,
        reason: "locked",
      };
      setState((s) => {
        if (s.seasonXp < def.xpRequired) {
          outcome = { ok: false, reason: "locked" };
          return s;
        }
        if (track === "premium" && !s.seasonPass.premiumOwned) {
          outcome = { ok: false, reason: "premium_required" };
          return s;
        }
        const claimed =
          track === "free" ? s.seasonPass.claimedFree : s.seasonPass.claimedPremium;
        if (claimed.includes(tier)) {
          outcome = { ok: false, reason: "already_claimed" };
          return s;
        }
        const next = clone(s) as GameState;
        switch (reward.kind) {
          case "coins":
            next.coins += reward.amount ?? 0;
            break;
          case "gems":
            next.gems += reward.amount ?? 0;
            break;
          case "essence":
            next.essence += reward.amount ?? 0;
            break;
          case "ticket":
            next.tickets = Math.min(
              next.maxTickets,
              next.tickets + (reward.amount ?? 0),
            );
            break;
          case "trait_fragment":
            next.traitFragments += reward.amount ?? 0;
            break;
          case "catalyst":
            next.catalysts += reward.amount ?? 0;
            break;
          case "cosmetic":
            if (reward.cosmeticId && !next.cosmetics.owned.includes(reward.cosmeticId)) {
              next.cosmetics.owned.push(reward.cosmeticId);
            }
            break;
        }
        if (track === "free") {
          next.seasonPass.claimedFree = [...next.seasonPass.claimedFree, tier];
        } else {
          next.seasonPass.claimedPremium = [...next.seasonPass.claimedPremium, tier];
        }
        outcome = { ok: true, reward };
        return next;
      });
      if (outcome.ok) {
        analytics.track("pass_reward_claimed", {
          tier,
          track,
          kind: reward.kind,
          amount: reward.amount,
          cosmeticId: reward.cosmeticId,
        });
      }
      return outcome;
    },
    [],
  );

  const purchasePassPremium = useCallback((): boolean => {
    let ok = false;
    setState((s) => {
      if (s.seasonPass.premiumOwned) return s;
      ok = true;
      return { ...s, seasonPass: { ...s.seasonPass, premiumOwned: true } };
    });
    if (ok) analytics.track("pass_premium_purchased", { season: state.season.number });
    return ok;
  }, [state.season.number]);

  const startNewSeason = useCallback(() => {
    analytics.track("season_reward_claimed");
    setState((s) => {
      const next = clone(s) as GameState;
      const newSeason = createSeason(next.clubName, next.tuning.leagueSize, next.season.number + 1);
      next.season = newSeason;
      const opp = getOpponentForMatchday(newSeason);
      if (opp) next.upcomingOpponent = { name: opp.name, rating: opp.rating };
      next.seasonXp = 0;
      // Pass progress resets each season; premium ownership is per-season.
      next.seasonPass = { premiumOwned: false, claimedFree: [], claimedPremium: [] };
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
      addGems,
      purchaseCosmetic,
      purchaseBundle,
      equipCosmetic,
      claimPassReward,
      purchasePassPremium,
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
      addGems,
      purchaseCosmetic,
      purchaseBundle,
      equipCosmetic,
      claimPassReward,
      purchasePassPremium,
    ],
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
