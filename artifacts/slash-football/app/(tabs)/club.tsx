import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import { haptics } from "@/services";

export default function ClubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, reset } = useGame();
  const [tapCount, setTapCount] = useState(0);
  const [hapticsOn, setHapticsOn] = useState(haptics.isEnabled());
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stay in sync with the persisted preference once it loads asynchronously.
  useEffect(() => haptics.subscribe(setHapticsOn), []);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;
  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom) + 84;

  const wins = state.results.filter((r) => r.homeScore > r.awayScore).length;
  const draws = state.results.filter((r) => r.homeScore === r.awayScore).length;
  const losses = state.results.filter((r) => r.homeScore < r.awayScore).length;
  const goalsFor = state.results.reduce((s, r) => s + r.homeScore, 0);
  const goalsAgainst = state.results.reduce((s, r) => s + r.awayScore, 0);

  const handleCrestTap = () => {
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 5) {
      setTapCount(0);
      router.push("/admin");
      return;
    }
    tapTimerRef.current = setTimeout(() => setTapCount(0), 800);
  };

  const handleReset = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Reset everything? Your club, players, and progress will be wiped.")) {
        reset();
      }
    } else {
      Alert.alert(
        "Reset progress?",
        "Your club, players, and progress will be wiped. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reset", style: "destructive", onPress: () => reset() },
        ],
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: bottomPad,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Club</Text>

        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Pressable onPress={handleCrestTap} style={[styles.crest, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={32} color={colors.primaryForeground} />
          </Pressable>
          <Text style={[styles.clubName, { color: colors.foreground }]}>
            {state.clubName}
          </Text>
          <Text style={[styles.managerLine, { color: colors.mutedForeground }]}>
            {state.manager} • Level {state.managerLevel}
          </Text>
          <View style={styles.trophyRow}>
            <View style={[styles.trophyBadge, { backgroundColor: "rgba(255,214,10,0.15)" }]}>
              <Feather name="award" size={12} color={colors.accent} />
              <Text style={[styles.trophyText, { color: colors.accent }]}>
                {state.championships} championships
              </Text>
            </View>
            <View style={[styles.trophyBadge, { backgroundColor: "rgba(0,255,136,0.12)" }]}>
              <Feather name="trending-up" size={12} color={colors.primary} />
              <Text style={[styles.trophyText, { color: colors.primary }]}>
                Season {state.season.number}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatBox label="Wins" value={`${wins}`} color={colors.primary} />
          <StatBox label="Draws" value={`${draws}`} color={colors.accent} />
          <StatBox label="Losses" value={`${losses}`} color={colors.destructive} />
        </View>
        <View style={styles.statsGrid}>
          <StatBox label="Goals For" value={`${goalsFor}`} color={colors.foreground} />
          <StatBox label="Goals Against" value={`${goalsAgainst}`} color={colors.foreground} />
          <StatBox label="Players" value={`${state.players.length}`} color={colors.foreground} />
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>
          INVENTORY
        </Text>
        <View
          style={[
            styles.invCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <InvRow icon="dollar-sign" label="Coins" value={state.coins} color={colors.accent} />
          <InvRow icon="zap" label="Tickets" value={`${state.tickets}/${state.maxTickets}`} color={colors.primary} />
          <InvRow icon="hexagon" label="Trait Fragments" value={state.traitFragments} color="#B36BFF" />
          <InvRow icon="aperture" label="Catalysts" value={state.catalysts} color="#FF8A3D" />
          <InvRow icon="droplet" label="Essence" value={state.essence} color="#41D7FF" />
          <InvRow icon="smile" label="Morale" value={state.morale} color="#FF8AC2" />
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>SLASH RECORDS</Text>
        <View
          style={[
            styles.invCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <InvRow icon="target" label="Best Slash Score" value={state.bestSlashScore} color={colors.primary} />
          <InvRow icon="play-circle" label="Total Slash Runs" value={state.totalSlashRuns} color={colors.accent} />
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>EXTRAS</Text>
        <View style={[styles.invCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            onPress={() => router.push("/shop")}
            style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.invIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="shopping-bag" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.invLabel, { color: colors.foreground }]}>Cosmetics shop</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/debug")}
            style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.invIcon, { backgroundColor: "#41D7FF22" }]}>
              <Feather name="activity" size={14} color="#41D7FF" />
            </View>
            <Text style={[styles.invLabel, { color: colors.foreground }]}>Sync & Debug</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>SETTINGS</Text>
        <View style={[styles.invCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.linkRow}>
            <View style={[styles.invIcon, { backgroundColor: "#FF8AC222" }]}>
              <Feather name="smartphone" size={14} color="#FF8AC2" />
            </View>
            <Text style={[styles.invLabel, { color: colors.foreground }]}>Haptics</Text>
            <Switch
              value={hapticsOn}
              onValueChange={(v) => {
                setHapticsOn(v);
                haptics.setEnabled(v);
                if (v) haptics.fire("tap");
              }}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </View>

        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [
            styles.resetBtn,
            { borderColor: colors.destructive, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="refresh-ccw" size={14} color={colors.destructive} />
          <Text style={[styles.resetText, { color: colors.destructive }]}>
            Reset progress
          </Text>
        </Pressable>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Tip: Tap the crest 5 times to access dev tuning.
        </Text>
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statBox,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
      <Text style={[styles.statBoxLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

function InvRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: number | string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.invRow}>
      <View style={[styles.invIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.invLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.invValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  heroCard: {
    marginTop: 14,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
  crest: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  clubName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  managerLine: { fontSize: 12, marginTop: 2, fontFamily: "Inter_500Medium" },
  trophyRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  trophyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  trophyText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", gap: 8, marginTop: 8 },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statBoxValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statBoxLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    marginTop: 2,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
  },
  section: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
  },
  invCard: { padding: 8, borderRadius: 14, borderWidth: 1 },
  invRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
  },
  invIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  invLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  invValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 10, textAlign: "center", marginTop: 12, fontFamily: "Inter_400Regular", opacity: 0.6 },
});
