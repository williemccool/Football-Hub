import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { analytics, flags, type FlagId } from "@/services";
import { listPresets, type BalancePresetId } from "@/lib/balancePresets";
import { BALANCE_PRESET_KEY } from "@/constants/storageKeys";
import { cache } from "@/services";

interface RecordedEvent {
  event: string;
  props: Record<string, unknown>;
  ts: number;
}

interface EconomySummary {
  totalRuns: number;
  avgCoinsPerRun: number;
  avgEssencePerRun: number;
  avgShardsPerRun: number;
  totalInjuries: number;
  unlocks: number;
  matchesPlayed: number;
  matchWinRate: number;
  upgrades: number;
}

function summarize(events: RecordedEvent[]): EconomySummary {
  let runs = 0;
  let coins = 0;
  let essence = 0;
  let shards = 0;
  let inj = 0;
  let unlocks = 0;
  let matches = 0;
  let wins = 0;
  let upgrades = 0;
  for (const e of events) {
    if (e.event === "slash_reward_claimed") {
      runs++;
      coins += Number(e.props.coins ?? 0);
      essence += Number(e.props.essence ?? 0);
      shards += Number(e.props.shards ?? 0);
      inj += Number(e.props.injuries ?? 0);
    } else if (e.event === "player_unlocked") {
      unlocks++;
    } else if (e.event === "match_completed") {
      matches++;
      if (e.props.outcome === "win") wins++;
    } else if (e.event === "player_upgraded") {
      upgrades++;
    }
  }
  return {
    totalRuns: runs,
    avgCoinsPerRun: runs ? Math.round(coins / runs) : 0,
    avgEssencePerRun: runs ? +(essence / runs).toFixed(1) : 0,
    avgShardsPerRun: runs ? +(shards / runs).toFixed(1) : 0,
    totalInjuries: inj,
    unlocks,
    matchesPlayed: matches,
    matchWinRate: matches ? Math.round((wins / matches) * 100) : 0,
    upgrades,
  };
}

export default function EconomyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, updateTuning } = useGame();
  const [events, setEvents] = useState<RecordedEvent[]>([]);
  const [presetId, setPresetId] = useState<BalancePresetId>("baseline");
  const [, setTick] = useState(0);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      // Hard-gate the live-ops surface on the feature flag, in addition to
      // hiding the link in Settings, so deep links can't expose it.
      await flags.whenReady();
      if (!flags.bool("ops_admin_visible")) {
        setAllowed(false);
        router.back();
        return;
      }
      setAllowed(true);
      const list = await analytics.recent();
      setEvents(list);
      const stored = await cache.read<BalancePresetId>(BALANCE_PRESET_KEY);
      if (stored) setPresetId(stored);
    })();
  }, []);

  const summary = summarize(events);
  const totalCoins = state.coins;
  const lineupRated = state.lineup
    .map((id) => state.players.find((p) => p.id === id))
    .filter(Boolean) as { rating: number }[];
  const teamRating = lineupRated.length
    ? Math.round(lineupRated.reduce((s, p) => s + p.rating, 0) / lineupRated.length)
    : 0;
  const ceilingHits = state.players.filter((p) => p.rating >= p.ceiling).length;

  const presets = listPresets();
  const flagList = flags.list();

  const applyPreset = async (id: BalancePresetId) => {
    const p = presets.find((pp) => pp.id === id);
    if (!p) return;
    setPresetId(id);
    await cache.write(BALANCE_PRESET_KEY, id);
    (Object.keys(p.tuning) as (keyof typeof p.tuning)[]).forEach((k) => {
      updateTuning({ [k]: p.tuning[k] } as Partial<typeof p.tuning>);
    });
    analytics.track("balance_preset_applied", { preset: id });
  };

  const toggleFlag = async (
    id: FlagId,
    current: boolean | string,
    def: { type: string; default: boolean | string; variants?: readonly string[] },
  ) => {
    if (def.type === "bool") {
      await flags.setOverride(id, !(current as boolean));
    } else {
      const vs = def.variants ?? [];
      const i = vs.indexOf(current as string);
      const next = vs[(i + 1) % vs.length] ?? def.default;
      await flags.setOverride(id, next as string);
    }
    analytics.track("feature_flag_overridden", { id });
    setTick((t) => t + 1);
  };

  if (allowed === false) return null;
  if (allowed === null) {
    return <View style={[styles.fill, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          ECONOMY · LIVE-OPS
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        <Section title="Run economy (last 50 events)">
          <Stat label="Slash runs" value={String(summary.totalRuns)} />
          <Stat label="Avg coins / run" value={String(summary.avgCoinsPerRun)} />
          <Stat label="Avg essence / run" value={String(summary.avgEssencePerRun)} />
          <Stat label="Avg shards / run" value={String(summary.avgShardsPerRun)} />
          <Stat label="Injuries triggered" value={String(summary.totalInjuries)} />
        </Section>

        <Section title="Progression health">
          <Stat label="Player unlocks" value={String(summary.unlocks)} />
          <Stat label="Player upgrades" value={String(summary.upgrades)} />
          <Stat label="Players at ceiling" value={`${ceilingHits} / ${state.players.length}`} />
          <Stat label="Team OVR" value={`${teamRating}`} />
          <Stat label="Coin balance" value={String(totalCoins)} />
        </Section>

        <Section title="Match outcomes">
          <Stat label="Matches played" value={String(summary.matchesPlayed)} />
          <Stat label="Win rate" value={`${summary.matchWinRate}%`} />
          <Stat label="Championships" value={String(state.championships)} />
        </Section>

        <Section title="Balance presets">
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            Switching a preset overwrites the current tuning. Internal use only.
          </Text>
          {presets.map((p) => {
            const active = p.id === presetId;
            return (
              <Pressable
                key={p.id}
                onPress={() => applyPreset(p.id)}
                style={({ pressed }) => [
                  styles.presetRow,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: active ? colors.primaryForeground : colors.foreground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 13,
                    }}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={{
                      color: active ? colors.primaryForeground : colors.mutedForeground,
                      fontSize: 11,
                      fontFamily: "Inter_500Medium",
                      marginTop: 2,
                    }}
                  >
                    {p.description}
                  </Text>
                </View>
                {active && (
                  <Feather name="check" size={14} color={colors.primaryForeground} />
                )}
              </Pressable>
            );
          })}
        </Section>

        <Section title="Feature flags">
          {flagList.map(({ id, def, value }) => (
            <Pressable
              key={id}
              onPress={() => toggleFlag(id, value, def)}
              style={({ pressed }) => [
                styles.flagRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 12 }}>
                  {id}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 10,
                    fontFamily: "Inter_500Medium",
                    marginTop: 2,
                  }}
                  numberOfLines={2}
                >
                  {def.description}
                </Text>
              </View>
              <Text style={[styles.flagValue, { color: colors.primary }]}>{String(value)}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={async () => {
              await flags.clearOverrides();
              setTick((t) => t + 1);
            }}
            style={({ pressed }) => [
              styles.clearBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="rotate-ccw" size={12} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              Clear flag overrides
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.section, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statVal, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 12, letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  section: { fontSize: 11, letterSpacing: 1, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  note: { fontSize: 11, marginBottom: 8, fontFamily: "Inter_500Medium" },
  flagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  flagValue: { fontSize: 12, fontFamily: "Inter_700Bold" },
  clearBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
