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
import { sortStandings } from "@/lib/league";
import { analytics } from "@/services";

export default function LeagueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, startNewSeason } = useGame();

  React.useEffect(() => {
    analytics.track("league_table_viewed");
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;
  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom) + 84;

  const standings = sortStandings(state.season.standings);
  const playerRank = standings.findIndex((s) => s.clubId === "player") + 1;

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
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>League</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Season {state.season.number} • Matchday {Math.min(state.season.matchday, state.season.totalMatchdays)} / {state.season.totalMatchdays}
            </Text>
          </View>
          <View style={[styles.rankBadge, { borderColor: colors.primary }]}>
            <Text style={[styles.rankBadgeLabel, { color: colors.mutedForeground }]}>RANK</Text>
            <Text style={[styles.rankBadgeNum, { color: colors.primary }]}>#{playerRank}</Text>
          </View>
        </View>

        {state.season.finished && (
          <View style={[styles.finishedCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <Feather name="award" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.finishedTitle, { color: colors.foreground }]}>
                Season {state.season.number} complete
              </Text>
              <Text style={[styles.finishedSub, { color: colors.mutedForeground }]}>
                Final standing: #{playerRank} • Champions: {state.season.clubs.find((c) => c.id === standings[0]?.clubId)?.name}
              </Text>
            </View>
            <Pressable
              onPress={() => startNewSeason()}
              style={({ pressed }) => [
                styles.newSeasonBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.newSeasonText, { color: colors.primaryForeground }]}>
                New season
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.section, { color: colors.mutedForeground }]}>STANDINGS</Text>
        <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.colRank, styles.headTxt, { color: colors.mutedForeground }]}>#</Text>
            <Text style={[styles.colName, styles.headTxt, { color: colors.mutedForeground }]}>Club</Text>
            <Text style={[styles.colNum, styles.headTxt, { color: colors.mutedForeground }]}>P</Text>
            <Text style={[styles.colNum, styles.headTxt, { color: colors.mutedForeground }]}>W</Text>
            <Text style={[styles.colNum, styles.headTxt, { color: colors.mutedForeground }]}>D</Text>
            <Text style={[styles.colNum, styles.headTxt, { color: colors.mutedForeground }]}>L</Text>
            <Text style={[styles.colGd, styles.headTxt, { color: colors.mutedForeground }]}>GD</Text>
            <Text style={[styles.colPts, styles.headTxt, { color: colors.mutedForeground }]}>PTS</Text>
          </View>
          {standings.map((s, i) => {
            const club = state.season.clubs.find((c) => c.id === s.clubId);
            const isPlayer = s.clubId === "player";
            const gd = s.goalsFor - s.goalsAgainst;
            const promoZone = i === 0;
            return (
              <View
                key={s.clubId}
                style={[
                  styles.tableRow,
                  {
                    backgroundColor: isPlayer ? colors.primary + "1A" : "transparent",
                    borderLeftWidth: 3,
                    borderLeftColor: isPlayer ? colors.primary : promoZone ? colors.accent : "transparent",
                  },
                ]}
              >
                <Text style={[styles.colRank, { color: isPlayer ? colors.primary : colors.foreground }]}>
                  {i + 1}
                </Text>
                <View style={styles.colName}>
                  <Text
                    style={{
                      color: isPlayer ? colors.primary : colors.foreground,
                      fontFamily: isPlayer ? "Inter_700Bold" : "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                    numberOfLines={1}
                  >
                    {club?.name ?? s.clubId}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                    {s.form.slice(-5).map((f, idx) => (
                      <View
                        key={idx}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            f === "W" ? colors.primary : f === "D" ? colors.accent : colors.destructive,
                        }}
                      />
                    ))}
                  </View>
                </View>
                <Text style={[styles.colNum, { color: colors.mutedForeground }]}>{s.played}</Text>
                <Text style={[styles.colNum, { color: colors.mutedForeground }]}>{s.wins}</Text>
                <Text style={[styles.colNum, { color: colors.mutedForeground }]}>{s.draws}</Text>
                <Text style={[styles.colNum, { color: colors.mutedForeground }]}>{s.losses}</Text>
                <Text
                  style={[
                    styles.colGd,
                    { color: gd > 0 ? colors.primary : gd < 0 ? colors.destructive : colors.mutedForeground },
                  ]}
                >
                  {gd > 0 ? `+${gd}` : gd}
                </Text>
                <Text style={[styles.colPts, { color: isPlayer ? colors.primary : colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {s.points}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          <Pressable
            onPress={() => router.push("/match")}
            disabled={state.season.finished}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: colors.primary,
                opacity: state.season.finished ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="play" size={16} color={colors.primaryForeground} />
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
              Play matchday
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 18 }]}>UPCOMING MATCHDAY</Text>
        <View style={[styles.fixtureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {state.season.schedule
            .filter((f) => f.matchday === state.season.matchday)
            .map((f) => {
              const home = state.season.clubs.find((c) => c.id === f.homeId);
              const away = state.season.clubs.find((c) => c.id === f.awayId);
              const isPlayer = f.homeId === "player" || f.awayId === "player";
              return (
                <View
                  key={`${f.matchday}-${f.homeId}-${f.awayId}`}
                  style={[
                    styles.fixtureRow,
                    { borderBottomColor: colors.border, borderLeftWidth: isPlayer ? 3 : 0, borderLeftColor: colors.primary },
                  ]}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: isPlayer ? colors.primary : colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      textAlign: "right",
                    }}
                  >
                    {home?.name}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginHorizontal: 8 }}>vs</Text>
                  <Text
                    style={{
                      flex: 1,
                      color: isPlayer ? colors.primary : colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {away?.name}
                  </Text>
                </View>
              );
            })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, marginTop: 2, fontFamily: "Inter_500Medium" },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  rankBadgeLabel: { fontSize: 9, letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  rankBadgeNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  finishedCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
  },
  finishedTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  finishedSub: { fontSize: 11, marginTop: 2, fontFamily: "Inter_500Medium" },
  newSeasonBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  newSeasonText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  section: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
  },
  tableCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  headTxt: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  colRank: { width: 22, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  colName: { flex: 1, paddingRight: 6 },
  colNum: { width: 22, fontSize: 11, textAlign: "center", fontFamily: "Inter_500Medium" },
  colGd: { width: 30, fontSize: 11, textAlign: "center", fontFamily: "Inter_600SemiBold" },
  colPts: { width: 32, fontSize: 13, textAlign: "right", fontFamily: "Inter_700Bold" },
  cta: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  fixtureCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  fixtureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
});
