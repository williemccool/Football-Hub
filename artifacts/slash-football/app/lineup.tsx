import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
import type { Role } from "@/lib/types";

const FORMATION_433: { role: Role; x: number; y: number }[] = [
  { role: "GK", x: 0.5, y: 0.92 },
  { role: "FB", x: 0.15, y: 0.75 },
  { role: "CB", x: 0.38, y: 0.78 },
  { role: "CB", x: 0.62, y: 0.78 },
  { role: "FB", x: 0.85, y: 0.75 },
  { role: "DM", x: 0.5, y: 0.6 },
  { role: "CM", x: 0.28, y: 0.5 },
  { role: "AM", x: 0.72, y: 0.5 },
  { role: "WG", x: 0.15, y: 0.25 },
  { role: "ST", x: 0.5, y: 0.18 },
  { role: "WG", x: 0.85, y: 0.25 },
];

export default function LineupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, setLineupSlot } = useGame();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const pitchW = 360;
  const pitchH = 480;

  const lineupIds = new Set(state.lineup);

  const benchPlayers = state.players.filter((p) => !lineupIds.has(p.id));

  const handlePickPlayer = (playerId: string) => {
    if (activeSlot === null) return;
    setLineupSlot(activeSlot, playerId);
    setActiveSlot(null);
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Lineup</Text>
        <Pressable onPress={() => router.push("/tactics")} style={styles.iconBtn}>
          <Feather name="sliders" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        {/* Pitch */}
        <View style={styles.pitchWrap}>
          <View
            style={[
              styles.pitch,
              { width: pitchW, height: pitchH, backgroundColor: "#0E2A1A", borderColor: "#1F4D2E" },
            ]}
          >
            <View style={[styles.pitchLine, { top: pitchH / 2 - 1 }]} />
            <View style={[styles.pitchCircle]} />
            {FORMATION_433.map((slot, idx) => {
              const playerId = state.lineup[idx];
              const player = state.players.find((p) => p.id === playerId);
              const isActive = activeSlot === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => setActiveSlot(idx)}
                  style={[
                    styles.slot,
                    {
                      left: slot.x * pitchW - 28,
                      top: slot.y * pitchH - 28,
                      borderColor: isActive
                        ? colors.accent
                        : player
                        ? colors.primary
                        : colors.border,
                      backgroundColor: player ? colors.card : "rgba(0,0,0,0.4)",
                    },
                  ]}
                >
                  {player ? (
                    <>
                      <Text style={[styles.slotRating, { color: colors.primary }]}>
                        {player.rating}
                      </Text>
                      <Text style={[styles.slotName, { color: colors.foreground }]} numberOfLines={1}>
                        {player.name.split(" ").slice(-1)[0]}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.slotRole, { color: colors.mutedForeground }]}>
                      {slot.role}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Bench picker */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Text style={[styles.subhead, { color: colors.mutedForeground }]}>
            {activeSlot === null
              ? "Tap a slot to swap a player"
              : `Pick a player for slot ${activeSlot + 1}`}
          </Text>
          {activeSlot !== null && (
            <Pressable
              onPress={() => {
                setLineupSlot(activeSlot, null);
                setActiveSlot(null);
              }}
              style={[
                styles.clearBtn,
                { borderColor: colors.destructive, backgroundColor: colors.card },
              ]}
            >
              <Feather name="x-circle" size={14} color={colors.destructive} />
              <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                Clear slot
              </Text>
            </Pressable>
          )}
          <View style={{ gap: 8, marginTop: 12 }}>
            {(activeSlot !== null ? state.players : benchPlayers).map((p) => {
              const inOther = state.lineup.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  disabled={activeSlot === null}
                  onPress={() => handlePickPlayer(p.id)}
                  style={({ pressed }) => [
                    styles.benchRow,
                    {
                      backgroundColor: colors.card,
                      borderColor: inOther ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={[styles.benchRating, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 13 }}>
                      {p.rating}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {p.name}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                      {p.role} • {p.archetype}
                    </Text>
                  </View>
                  {inOther && (
                    <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                      IN XI
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
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
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  pitchWrap: { alignItems: "center", paddingVertical: 16 },
  pitch: {
    borderRadius: 16,
    borderWidth: 2,
    position: "relative",
    overflow: "hidden",
  },
  pitchLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#1F4D2E",
  },
  pitchCircle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#1F4D2E",
    marginLeft: -40,
    marginTop: -40,
  },
  slot: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  slotRating: { fontSize: 14, fontFamily: "Inter_700Bold" },
  slotName: { fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: -2, paddingHorizontal: 2 },
  slotRole: { fontSize: 11, fontFamily: "Inter_700Bold" },
  subhead: { fontSize: 12, fontFamily: "Inter_500Medium" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  benchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  benchRating: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
