import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlayerCard } from "@/components/PlayerCard";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import type { Player, Role } from "@/lib/types";

const ROLE_FILTERS: ("ALL" | Role)[] = [
  "ALL",
  "GK",
  "CB",
  "FB",
  "DM",
  "CM",
  "AM",
  "WG",
  "ST",
];

export default function SquadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const [filter, setFilter] = useState<(typeof ROLE_FILTERS)[number]>("ALL");
  const [sort, setSort] = useState<"rating" | "role">("rating");

  const filtered = useMemo(() => {
    let arr: Player[] = [...state.players];
    if (filter !== "ALL") arr = arr.filter((p) => p.role === filter);
    if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    else arr.sort((a, b) => a.role.localeCompare(b.role) || b.rating - a.rating);
    return arr;
  }, [state.players, filter, sort]);

  const inLineup = new Set(state.lineup);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 8;
  const bottomPad = (Platform.OS === "web" ? 100 : insets.bottom) + 84;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Squad</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => router.push("/lineup")}
              style={({ pressed }) => [
                styles.headerBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="grid" size={14} color={colors.primaryForeground} />
              <Text style={[styles.headerBtnText, { color: colors.primaryForeground }]}>
                Lineup
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/tactics")}
              style={({ pressed }) => [
                styles.headerBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="sliders" size={14} color={colors.foreground} />
              <Text style={[styles.headerBtnText, { color: colors.foreground }]}>
                Tactics
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {ROLE_FILTERS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setFilter(r)}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === r ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: filter === r ? colors.primaryForeground : colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                }}
              >
                {r}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>
            {filtered.length} player{filtered.length === 1 ? "" : "s"}
          </Text>
          <Pressable
            onPress={() => setSort(sort === "rating" ? "role" : "rating")}
            style={styles.sortBtn}
          >
            <Feather
              name={sort === "rating" ? "trending-down" : "list"}
              size={12}
              color={colors.mutedForeground}
            />
            <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>
              {sort === "rating" ? "By rating" : "By role"}
            </Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {filtered.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              highlight={inLineup.has(p.id)}
              onPress={() => router.push({ pathname: "/player/[id]", params: { id: p.id } })}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  title: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerBtnText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sortLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
