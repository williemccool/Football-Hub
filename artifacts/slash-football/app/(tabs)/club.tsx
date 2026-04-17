import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

export default function ClubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, reset } = useGame();

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;
  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom) + 84;

  const wins = state.results.filter((r) => r.homeScore > r.awayScore).length;
  const draws = state.results.filter((r) => r.homeScore === r.awayScore).length;
  const losses = state.results.filter((r) => r.homeScore < r.awayScore).length;
  const goalsFor = state.results.reduce((s, r) => s + r.homeScore, 0);
  const goalsAgainst = state.results.reduce((s, r) => s + r.awayScore, 0);

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
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Club</Text>

        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.crest, { backgroundColor: colors.primary }]}
          >
            <Feather name="zap" size={32} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.clubName, { color: colors.foreground }]}>
            {state.clubName}
          </Text>
          <Text style={[styles.managerLine, { color: colors.mutedForeground }]}>
            {state.manager} • Level {state.managerLevel}
          </Text>
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
          <InvRow icon="flame" label="Trait Fragments" value={state.traitFragments} color="#B36BFF" />
          <InvRow icon="aperture" label="Catalysts" value={state.catalysts} color="#FF8A3D" />
          <InvRow icon="droplet" label="Essence" value={state.essence} color="#41D7FF" />
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
  title: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
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
  clubName: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  managerLine: { fontSize: 12, marginTop: 2, fontFamily: "Inter_500Medium" },
  statsGrid: { flexDirection: "row", gap: 8, marginTop: 8 },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statBoxValue: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
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
  invValue: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
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
});
