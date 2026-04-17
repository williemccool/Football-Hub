import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Player } from "@/lib/types";

const RARITY_COLOR: Record<Player["rarity"], string> = {
  Common: "#7B8497",
  Uncommon: "#41D7FF",
  Rare: "#B36BFF",
  Epic: "#FFD60A",
  Legendary: "#FF8A3D",
};

export function PlayerCard({
  player,
  onPress,
  highlight,
  compact,
}: {
  player: Player;
  onPress?: () => void;
  highlight?: boolean;
  compact?: boolean;
}) {
  const colors = useColors();
  const rarityColor = RARITY_COLOR[player.rarity];
  const progress = player.rating >= player.ceiling ? 1 : player.shards / player.shardsToNext;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: highlight ? colors.primary : colors.border,
          borderWidth: highlight ? 2 : 1,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.ratingBadge, { backgroundColor: rarityColor }]}>
        <Text style={styles.ratingText}>{player.rating}</Text>
        <Text style={styles.roleText}>{player.role}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {player.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {player.nationality} • {player.archetype}
          </Text>
        </View>

        {!compact && (
          <View style={styles.statsRow}>
            <Stat label="PAC" value={player.stats.pace} colors={colors} />
            <Stat label="SHO" value={player.stats.shooting} colors={colors} />
            <Stat label="PAS" value={player.stats.passing} colors={colors} />
            <Stat label="DEF" value={player.stats.defense} colors={colors} />
          </View>
        )}

        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: colors.secondary },
            ]}
          >
            <View
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                backgroundColor: colors.primary,
                borderRadius: 4,
              }}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {player.rating >= player.ceiling
              ? "MAX"
              : `${player.shards}/${player.shardsToNext}`}
          </Text>
        </View>

        {player.trait && (
          <View style={[styles.trait, { backgroundColor: colors.secondary }]}>
            <Feather name="zap" size={10} color={colors.accent} />
            <Text style={[styles.traitText, { color: colors.accent }]}>
              {player.trait}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.statCol}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 14,
    gap: 12,
    alignItems: "center",
  },
  ratingBadge: {
    width: 56,
    height: 64,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingText: { fontSize: 24, fontWeight: "800", color: "#0A0E1A", fontFamily: "Inter_700Bold" },
  roleText: { fontSize: 11, fontWeight: "700", color: "#0A0E1A", marginTop: -2, fontFamily: "Inter_600SemiBold" },
  name: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  metaRow: { marginTop: 2 },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  statCol: { alignItems: "flex-start" },
  statValue: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  statLabel: { fontSize: 9, marginTop: -1, fontFamily: "Inter_500Medium" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  progressBar: { flex: 1, height: 5, borderRadius: 4, overflow: "hidden" },
  progressText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  trait: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  traitText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
