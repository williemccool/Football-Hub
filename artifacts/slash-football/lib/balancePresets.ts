import type { TuningConfig } from "./types";
import { defaultTuning } from "./seedData";

/**
 * Named balance presets for testing. NOT for production users — switching
 * a preset writes into TuningConfig (admin-only). Live-ops can map a cohort
 * to a preset via tester.experimentGroup.
 */

export type BalancePresetId =
  | "baseline"
  | "generous_onboarding"
  | "high_risk_slash"
  | "progression_friendly"
  | "conservative_economy";

export interface BalancePreset {
  id: BalancePresetId;
  name: string;
  description: string;
  tuning: TuningConfig;
}

export function listPresets(): BalancePreset[] {
  const base = defaultTuning();
  return [
    {
      id: "baseline",
      name: "Baseline",
      description: "Default shipping values. Calibrated for steady mid-core pacing.",
      tuning: base,
    },
    {
      id: "generous_onboarding",
      name: "Generous onboarding",
      description: "Faster ticket refill, cheaper upgrades, fewer hazards. Good for first-7-day FTUE tests.",
      tuning: {
        ...base,
        ticketCap: Math.min(20, base.ticketCap + 2),
        ticketRefillMs: Math.max(60_000, Math.round(base.ticketRefillMs * 0.6)),
        spawnDensity: +(base.spawnDensity * 1.2).toFixed(2),
        hazardChance: +(base.hazardChance * 0.6).toFixed(2),
        injuryChance: +(base.injuryChance * 0.5).toFixed(2),
        shardsToFirstUpgrade: Math.max(2, base.shardsToFirstUpgrade - 2),
        duplicateCoinValue: Math.round(base.duplicateCoinValue * 1.4),
        matchCoinWin: Math.round(base.matchCoinWin * 1.25),
        matchCoinDraw: Math.round(base.matchCoinDraw * 1.25),
      },
    },
    {
      id: "high_risk_slash",
      name: "High-risk slash",
      description: "More hazards, more injuries, bigger morale swings. Tests slash difficulty ceiling.",
      tuning: {
        ...base,
        spawnDensity: +(base.spawnDensity * 1.3).toFixed(2),
        hazardChance: +(base.hazardChance * 1.8).toFixed(2),
        injuryChance: Math.min(1, +(base.injuryChance * 1.7).toFixed(2)),
        moraleHitValue: base.moraleHitValue + 4,
      },
    },
    {
      id: "progression_friendly",
      name: "Progression-friendly",
      description: "Faster player upgrades and richer match rewards. Tests progression pacing.",
      tuning: {
        ...base,
        shardsToFirstUpgrade: Math.max(2, base.shardsToFirstUpgrade - 1),
        duplicateCoinValue: Math.round(base.duplicateCoinValue * 1.2),
        matchCoinWin: Math.round(base.matchCoinWin * 1.2),
        matchCoinDraw: Math.round(base.matchCoinDraw * 1.15),
        seasonChampionReward: Math.round(base.seasonChampionReward * 1.3),
      },
    },
    {
      id: "conservative_economy",
      name: "Conservative economy",
      description: "Slower refills, tighter coin output, harder upgrades. Tests inflation risk.",
      tuning: {
        ...base,
        ticketRefillMs: Math.round(base.ticketRefillMs * 1.4),
        shardsToFirstUpgrade: base.shardsToFirstUpgrade + 2,
        duplicateCoinValue: Math.round(base.duplicateCoinValue * 0.7),
        matchCoinWin: Math.round(base.matchCoinWin * 0.8),
        matchCoinDraw: Math.round(base.matchCoinDraw * 0.8),
        seasonChampionReward: Math.round(base.seasonChampionReward * 0.8),
      },
    },
  ];
}

export function getPreset(id: BalancePresetId): BalancePreset {
  const all = listPresets();
  return all.find((p) => p.id === id) ?? all[0]!;
}
