import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HudPill } from "@/components/HudPill";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";

function formatMs(ms: number) {
  if (ms <= 0) return "Ready";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function HubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, msUntilNextTicket } = useGame();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const ticketCountdown = formatMs(msUntilNextTicket());
  const xpForNext = state.managerLevel * 200;
  const xpPct = state.managerXp / xpForNext;

  const topWeb = Platform.OS === "web" ? 67 : insets.top + 8;
  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom) + 84;

  const lineupCount = state.lineup.filter(Boolean).length;
  const teamRating = (() => {
    const ps = state.lineup
      .map((id) => state.players.find((p) => p.id === id))
      .filter(Boolean);
    if (ps.length === 0) return 0;
    return Math.round(ps.reduce((s, p) => s + (p?.rating ?? 0), 0) / ps.length);
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topWeb,
          paddingBottom: bottomPad,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.clubName, { color: colors.foreground }]}>
              {state.clubName}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Manager Lv {state.managerLevel} • {state.manager}
            </Text>
          </View>
          <View style={styles.hudRow}>
            <HudPill icon="dollar-sign" value={state.coins} color={colors.accent} />
          </View>
        </View>

        <View
          style={[
            styles.xpBar,
            { backgroundColor: colors.secondary, marginTop: 10 },
          ]}
        >
          <View
            style={{
              width: `${Math.min(100, xpPct * 100)}%`,
              height: "100%",
              backgroundColor: colors.primary,
              borderRadius: 4,
            }}
          />
        </View>
        <Text style={[styles.xpText, { color: colors.mutedForeground }]}>
          {state.managerXp} / {xpForNext} XP
        </Text>

        {/* Slash CTA */}
        <Pressable
          onPress={() => state.tickets > 0 && router.push("/scout")}
          disabled={state.tickets <= 0}
          style={({ pressed }) => [
            styles.slashCard,
            {
              opacity: state.tickets <= 0 ? 0.5 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <LinearGradient
            colors={["#003B22", "#00FF88"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.slashGradient}
          >
            <View style={styles.slashTop}>
              <Text style={styles.slashLabel}>SCOUTING RUN</Text>
              <View style={styles.ticketBadge}>
                <Feather name="zap" size={12} color="#0A0E1A" />
                <Text style={styles.ticketBadgeText}>
                  {state.tickets}/{state.maxTickets}
                </Text>
              </View>
            </View>
            <Text style={styles.slashTitle}>SLASH</Text>
            <Text style={styles.slashSubtitle}>
              20 seconds. Slice prospects, dodge traps. Build your club.
            </Text>
            <View style={styles.slashFooter}>
              <Feather name="play-circle" size={20} color="#0A0E1A" />
              <Text style={styles.slashFooterText}>
                {state.tickets > 0
                  ? "Tap to start"
                  : `Next ticket in ${ticketCountdown}`}
              </Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Quick stats */}
        <View style={styles.quickRow}>
          <QuickStat
            label="Squad"
            value={`${state.players.length}`}
            sub={`${teamRating} OVR`}
          />
          <QuickStat
            label="Lineup"
            value={`${lineupCount}/11`}
            sub={state.formation}
          />
          <QuickStat
            label="Trait Frags"
            value={`${state.traitFragments}`}
            sub={`Catalysts ${state.catalysts}`}
          />
        </View>

        {/* Next fixture */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Next Fixture
            </Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
          <View style={styles.fixtureRow}>
            <View style={styles.fixtureSide}>
              <Text style={[styles.fixtureClub, { color: colors.foreground }]}>
                {state.clubName}
              </Text>
              <Text style={[styles.fixtureRating, { color: colors.primary }]}>
                {teamRating} OVR
              </Text>
            </View>
            <Text style={[styles.fixtureVs, { color: colors.mutedForeground }]}>vs</Text>
            <View style={[styles.fixtureSide, { alignItems: "flex-end" }]}>
              <Text style={[styles.fixtureClub, { color: colors.foreground }]}>
                {state.upcomingOpponent.name}
              </Text>
              <Text style={[styles.fixtureRating, { color: colors.destructive }]}>
                {state.upcomingOpponent.rating} OVR
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/match")}
            style={({ pressed }) => [
              styles.playButton,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="play" size={16} color={colors.primaryForeground} />
            <Text
              style={[styles.playButtonText, { color: colors.primaryForeground }]}
            >
              Play match
            </Text>
          </Pressable>
        </View>

        {/* Daily missions */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Daily Missions
            </Text>
          </View>
          {state.dailyMissions.map((m) => (
            <View key={m.id} style={styles.missionRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.missionText, { color: colors.foreground }]}>
                  {m.text}
                </Text>
                <View
                  style={[
                    styles.missionBar,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <View
                    style={{
                      width: `${Math.min(100, (m.progress / m.target) * 100)}%`,
                      height: "100%",
                      backgroundColor: m.done ? colors.primary : colors.accent,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
              <View style={styles.missionRewardCol}>
                {m.done ? (
                  <Feather name="check-circle" size={18} color={colors.primary} />
                ) : (
                  <View style={styles.missionRewardPill}>
                    <Feather name="dollar-sign" size={11} color={colors.accent} />
                    <Text style={[styles.missionRewardText, { color: colors.accent }]}>
                      {m.reward}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function QuickStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.quickStat,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.quickValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clubName: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, marginTop: 2, fontFamily: "Inter_500Medium" },
  hudRow: { flexDirection: "row", gap: 6 },
  xpBar: { height: 6, borderRadius: 4, overflow: "hidden" },
  xpText: { fontSize: 10, marginTop: 4, fontFamily: "Inter_500Medium" },
  slashCard: {
    marginTop: 18,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  slashGradient: {
    padding: 22,
    minHeight: 200,
  },
  slashTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slashLabel: {
    fontSize: 11,
    color: "#0A0E1A",
    fontWeight: "700",
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  ticketBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10,14,26,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ticketBadgeText: {
    color: "#FFD60A",
    fontWeight: "700",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  slashTitle: {
    fontSize: 64,
    fontWeight: "900",
    color: "#0A0E1A",
    letterSpacing: -2,
    marginTop: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 64,
  },
  slashSubtitle: {
    color: "rgba(10,14,26,0.7)",
    fontSize: 13,
    marginTop: 4,
    fontFamily: "Inter_500Medium",
  },
  slashFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
  },
  slashFooterText: {
    color: "#0A0E1A",
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  quickStat: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
  },
  quickValue: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
    fontFamily: "Inter_700Bold",
  },
  quickSub: { fontSize: 10, marginTop: 1, fontFamily: "Inter_400Regular" },
  section: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  fixtureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  fixtureSide: { flex: 1 },
  fixtureClub: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  fixtureRating: { fontSize: 12, marginTop: 2, fontFamily: "Inter_600SemiBold" },
  fixtureVs: {
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 8,
    fontFamily: "Inter_500Medium",
  },
  playButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
  },
  missionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10 },
  missionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  missionBar: { height: 5, borderRadius: 4, overflow: "hidden", marginTop: 6 },
  missionRewardCol: { width: 56, alignItems: "flex-end" },
  missionRewardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  missionRewardText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
});
