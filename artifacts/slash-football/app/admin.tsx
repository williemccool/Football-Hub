import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import { defaultTuning } from "@/lib/seedData";
import type { TuningConfig } from "@/lib/types";

interface Slider {
  key: keyof TuningConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}

const SLIDERS: Slider[] = [
  { key: "ticketCap", label: "Ticket Cap", min: 1, max: 20, step: 1 },
  { key: "ticketRefillMs", label: "Ticket Refill (min)", min: 1, max: 180, step: 1, format: (v) => `${Math.round(v / 60000)}m` },
  { key: "spawnDensity", label: "Spawn Density ×", min: 0.5, max: 3, step: 0.1, format: (v) => v.toFixed(1) },
  { key: "hazardChance", label: "Hazard Chance ×", min: 0, max: 3, step: 0.1, format: (v) => v.toFixed(1) },
  { key: "injuryChance", label: "Injury Chance", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "moraleHitValue", label: "Morale Hit Value", min: 0, max: 30, step: 1 },
  { key: "shardsToFirstUpgrade", label: "Shards → 1st Upgrade", min: 2, max: 30, step: 1 },
  { key: "duplicateCoinValue", label: "Duplicate Coin Value", min: 10, max: 500, step: 10 },
  { key: "matchCoinWin", label: "Match Win Coins", min: 50, max: 1000, step: 25 },
  { key: "matchCoinDraw", label: "Match Draw Coins", min: 25, max: 500, step: 25 },
  { key: "leagueSize", label: "League Size", min: 4, max: 12, step: 2 },
  { key: "seasonChampionReward", label: "Champion Reward", min: 250, max: 5000, step: 250 },
];

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, updateTuning, startNewSeason } = useGame();

  const set = (key: keyof TuningConfig, value: number) => {
    if (key === "ticketRefillMs") {
      updateTuning({ ticketRefillMs: value * 60_000 });
    } else {
      updateTuning({ [key]: value } as Partial<TuningConfig>);
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>ADMIN • TUNING</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.accent} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            Internal dev tools. Tweak gameplay variables on the fly.
          </Text>
        </View>

        {SLIDERS.map((s) => {
          const rawValue = state.tuning[s.key] as number;
          const value = s.key === "ticketRefillMs" ? rawValue / 60_000 : rawValue;
          return (
            <View key={s.key} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={[styles.label, { color: colors.foreground }]}>{s.label}</Text>
                <Text style={[styles.value, { color: colors.primary }]}>
                  {s.format ? s.format(s.key === "ticketRefillMs" ? rawValue : value) : value}
                </Text>
              </View>
              <View style={styles.btnRow}>
                <StepBtn
                  label={`-${s.step}`}
                  onPress={() => set(s.key, Math.max(s.min, value - s.step))}
                  colors={colors}
                />
                <StepBtn
                  label={`+${s.step}`}
                  onPress={() => set(s.key, Math.min(s.max, value + s.step))}
                  colors={colors}
                />
                <StepBtn
                  label="MIN"
                  onPress={() => set(s.key, s.min)}
                  colors={colors}
                />
                <StepBtn
                  label="MAX"
                  onPress={() => set(s.key, s.max)}
                  colors={colors}
                />
              </View>
            </View>
          );
        })}

        <Pressable
          onPress={() => {
            const d = defaultTuning();
            (Object.keys(d) as (keyof TuningConfig)[]).forEach((k) => updateTuning({ [k]: d[k] } as Partial<TuningConfig>));
          }}
          style={({ pressed }) => [
            styles.resetBtn,
            { borderColor: colors.accent, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="rotate-ccw" size={14} color={colors.accent} />
          <Text style={[styles.resetText, { color: colors.accent }]}>Reset tuning to defaults</Text>
        </Pressable>

        <Pressable
          onPress={startNewSeason}
          style={({ pressed }) => [
            styles.resetBtn,
            { borderColor: colors.primary, opacity: pressed ? 0.7 : 1, marginTop: 10 },
          ]}
        >
          <Feather name="play-circle" size={14} color={colors.primary} />
          <Text style={[styles.resetText, { color: colors.primary }]}>Start new season now</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StepBtn({ label, onPress, colors }: { label: string; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepBtn,
        { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.stepText, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 12, letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  notice: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  noticeText: { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium" },
  row: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  value: { fontSize: 14, fontFamily: "Inter_700Bold" },
  btnRow: { flexDirection: "row", gap: 6 },
  stepBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  stepText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  resetBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
