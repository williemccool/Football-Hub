import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
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
import { getOpponentForMatchday } from "@/lib/league";

export default function FixturesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useGame();

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;
  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom) + 84;

  const teamRating = (() => {
    const ps = state.lineup
      .map((id) => state.players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (ps.length === 0) return 0;
    return Math.round(ps.reduce((s, p) => s + (p?.rating ?? 0), 0) / ps.length);
  })();

  const opp = getOpponentForMatchday(state.season);
  const playerSchedule = state.season.schedule.filter(
    (f) => f.homeId === "player" || f.awayId === "player",
  );
  const upcomingPlayer = playerSchedule.filter((f) => !f.played).slice(0, 5);
  const playedPlayer = playerSchedule.filter((f) => f.played).slice(-5).reverse();

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
        <Text style={[styles.title, { color: colors.foreground }]}>Fixtures</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Season {state.season.number} • Matchday {Math.min(state.season.matchday, state.season.totalMatchdays)} / {state.season.totalMatchdays}
        </Text>

        {/* Next match (player) */}
        {opp && !state.season.finished && (
          <>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>NEXT MATCH</Text>
            <View
              style={[
                styles.upcomingCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.upcomingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>
                    {opp.isHome ? "HOME" : "AWAY"} • Matchday {state.season.matchday}
                  </Text>
                  <Text style={[styles.opponentName, { color: colors.foreground }]}>
                    {opp.name}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <View style={styles.ratingChip}>
                      <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                        YOU {teamRating}
                      </Text>
                    </View>
                    <View style={styles.ratingChip}>
                      <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                        OPP {opp.rating}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => router.push("/match")}
                  style={({ pressed }) => [
                    styles.playBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Feather name="play" size={20} color={colors.primaryForeground} />
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* Schedule */}
        {upcomingPlayer.length > 0 && (
          <>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>UPCOMING SCHEDULE</Text>
            <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {upcomingPlayer.map((f) => {
                const isHome = f.homeId === "player";
                const oppId = isHome ? f.awayId : f.homeId;
                const oppClub = state.season.clubs.find((c) => c.id === oppId);
                return (
                  <View key={`u-${f.matchday}`} style={[styles.scheduleRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.mdNum, { color: colors.mutedForeground }]}>MD{f.matchday}</Text>
                    <View style={[styles.haTag, { backgroundColor: isHome ? colors.primary + "33" : "rgba(255,255,255,0.1)" }]}>
                      <Text style={{ color: isHome ? colors.primary : colors.mutedForeground, fontSize: 10, fontFamily: "Inter_700Bold" }}>
                        {isHome ? "H" : "A"}
                      </Text>
                    </View>
                    <Text style={[styles.opp, { color: colors.foreground }]}>{oppClub?.name}</Text>
                    <Text style={[styles.oppRating, { color: colors.mutedForeground }]}>{oppClub?.rating}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Past results */}
        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 18 }]}>
          RECENT RESULTS
        </Text>
        {state.results.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.border }]}>
            <Feather name="calendar" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No matches played yet. Tap play above to start your season.
            </Text>
          </View>
        ) : (
          state.results.slice(0, 8).map((r) => {
            const win = r.homeScore > r.awayScore;
            const draw = r.homeScore === r.awayScore;
            const tag = win ? "W" : draw ? "D" : "L";
            const tagColor = win
              ? colors.primary
              : draw
              ? colors.accent
              : colors.destructive;
            return (
              <View
                key={r.id}
                style={[
                  styles.resultCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.resultTag, { backgroundColor: tagColor }]}>
                  <Text style={styles.resultTagText}>{tag}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultOpp, { color: colors.foreground }]}>
                    vs {r.opponent}
                  </Text>
                  <Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>
                    {r.matchday ? `MD${r.matchday} • ` : ""}+{r.rewards.coins} coins
                  </Text>
                </View>
                <Text style={[styles.resultScore, { color: colors.foreground }]}>
                  {r.homeScore} – {r.awayScore}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, marginTop: 2, fontFamily: "Inter_500Medium" },
  section: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
  },
  upcomingCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  upcomingRow: { flexDirection: "row", alignItems: "center" },
  smallLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: "Inter_600SemiBold",
  },
  opponentName: { fontSize: 18, marginTop: 2, fontFamily: "Inter_700Bold" },
  ratingChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  mdNum: { fontSize: 11, fontFamily: "Inter_700Bold", width: 38 },
  haTag: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  opp: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  oppRating: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyText: { fontSize: 13, textAlign: "center", fontFamily: "Inter_500Medium" },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  resultTag: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTagText: { color: "#0A0E1A", fontWeight: "800", fontFamily: "Inter_700Bold" },
  resultOpp: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  resultMeta: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  resultScore: { fontSize: 18, fontFamily: "Inter_700Bold" },
});
