import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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

import { SalvagePicker, getRememberedSalvage } from "@/components/SalvagePicker";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import { haptics } from "@/services";
import type { SalvageMode } from "@/context/GameContext";
import type { Role } from "@/lib/types";

const FORMATION_433_ROLES: Role[] = [
  "GK",
  "FB",
  "CB",
  "CB",
  "FB",
  "DM",
  "CM",
  "AM",
  "WG",
  "ST",
  "WG",
];

const RARITY_COLOR = {
  Common: "#7B8497",
  Uncommon: "#41D7FF",
  Rare: "#B36BFF",
  Epic: "#FFD60A",
  Legendary: "#FF8A3D",
};

export default function PlayerDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, upgradePlayer, unlockTrait, salvagePlayer, setLineupSlot } = useGame();
  const player = state.players.find((p) => p.id === id);
  const [salvageOpen, setSalvageOpen] = useState(false);

  const hasEvolutionTarget = useMemo(() => {
    if (!player) return false;
    return state.players.some(
      (pp) => pp.role === player.role && pp.id !== player.id && pp.rating < pp.ceiling,
    );
  }, [player, state.players]);

  if (!player) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.mutedForeground }}>Player not found.</Text>
      </View>
    );
  }

  const upgradeCost = 50 + (player.rating - 60) * 12;
  const canUpgrade = player.rating < player.ceiling && state.coins >= upgradeCost;
  const canTrait = !player.trait && state.traitFragments >= 3;
  const inLineup = state.lineup.includes(player.id);
  const rarityColor = RARITY_COLOR[player.rarity];

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.mutedForeground }]}>
          PROSPECT
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }}
      >
        <View style={styles.heroRow}>
          <View style={[styles.bigBadge, { backgroundColor: rarityColor }]}>
            <Text style={styles.bigBadgeRating}>{player.rating}</Text>
            <Text style={styles.bigBadgeRole}>{player.role}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={2}>
              {player.name}
            </Text>
            <Text style={[styles.playerMeta, { color: colors.mutedForeground }]}>
              {player.nationality} • Age {player.age} • {player.archetype}
            </Text>
            <View style={[styles.rarityChip, { backgroundColor: rarityColor + "22" }]}>
              <Text style={{ color: rarityColor, fontFamily: "Inter_700Bold", fontSize: 11 }}>
                {player.rarity.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.ratingBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.ratingRowTop}>
            <Text style={[styles.ratingNow, { color: colors.foreground }]}>
              {player.rating}
            </Text>
            <Feather name="arrow-right" size={20} color={colors.mutedForeground} />
            <Text style={[styles.ratingCeil, { color: colors.primary }]}>
              {player.ceiling}
            </Text>
            <Text style={[styles.ratingCeilLabel, { color: colors.mutedForeground }]}>
              ceiling
            </Text>
          </View>
          <View style={[styles.shardBar, { backgroundColor: colors.secondary, marginTop: 10 }]}>
            <View
              style={{
                width: `${(player.shards / player.shardsToNext) * 100}%`,
                height: "100%",
                backgroundColor: colors.primary,
                borderRadius: 6,
              }}
            />
          </View>
          <Text style={[styles.shardText, { color: colors.mutedForeground }]}>
            {player.shards}/{player.shardsToNext} shards to next
          </Text>
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>STATS</Text>
        <View style={[styles.statsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(
            [
              ["Pace", "pace"],
              ["Shooting", "shooting"],
              ["Passing", "passing"],
              ["Control", "control"],
              ["Defense", "defense"],
              ["Physical", "physical"],
            ] as [string, keyof typeof player.stats][]
          ).map(([label, k]) => (
            <View key={k} style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
              <View style={[styles.statBarBg, { backgroundColor: colors.secondary }]}>
                <View
                  style={{
                    width: `${player.stats[k]}%`,
                    height: "100%",
                    backgroundColor:
                      player.stats[k] >= 80
                        ? colors.primary
                        : player.stats[k] >= 65
                        ? colors.accent
                        : colors.mutedForeground,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {player.stats[k]}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>TRAIT</Text>
        <View style={[styles.traitBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {player.trait ? (
            <View style={styles.traitRow}>
              <Feather name="zap" size={16} color={colors.accent} />
              <Text style={[styles.traitText, { color: colors.foreground }]}>
                {player.trait}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.traitEmpty, { color: colors.mutedForeground }]}>
                No trait equipped. Forge one with 3 trait fragments (you have {state.traitFragments}).
              </Text>
              <Pressable
                disabled={!canTrait}
                onPress={() => unlockTrait(player.id)}
                style={({ pressed }) => [
                  styles.traitBtn,
                  {
                    backgroundColor: canTrait ? colors.accent : colors.secondary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.traitBtnText,
                    { color: canTrait ? colors.accentForeground : colors.mutedForeground },
                  ]}
                >
                  Forge trait • 3 fragments
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => upgradePlayer(player.id)}
          disabled={!canUpgrade}
          style={({ pressed }) => [
            styles.upgradeBtn,
            {
              backgroundColor: canUpgrade ? colors.primary : colors.secondary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather
            name="arrow-up-circle"
            size={18}
            color={canUpgrade ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.upgradeBtnText,
              { color: canUpgrade ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            {player.rating >= player.ceiling
              ? "Maxed out"
              : `Train +1 OVR • ${upgradeCost} coins`}
          </Text>
        </Pressable>

        {inLineup && (
          <Pressable
            onPress={() => {
              haptics.fire("tap");
              const slotIdx = state.lineup.indexOf(player.id);
              if (slotIdx !== -1) setLineupSlot(slotIdx, null);
            }}
            style={({ pressed }) => [
              styles.lineupBadge,
              { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="check-circle" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
              In starting lineup • tap to remove
            </Text>
          </Pressable>
        )}

        {!inLineup && (
          <Pressable
            onPress={() => {
              haptics.fire("tap");
              const emptyIdx = FORMATION_433_ROLES.findIndex(
                (role, idx) => role === player.role && !state.lineup[idx],
              );
              if (emptyIdx !== -1) {
                setLineupSlot(emptyIdx, player.id);
                haptics.fire("success");
                return;
              }
              const sameRoleIdxs = FORMATION_433_ROLES
                .map((role, idx) => ({ role, idx }))
                .filter((r) => r.role === player.role);
              if (sameRoleIdxs.length > 0) {
                let weakest = sameRoleIdxs[0]!;
                let weakestRating = Infinity;
                for (const s of sameRoleIdxs) {
                  const pid = state.lineup[s.idx];
                  const occ = state.players.find((pp) => pp.id === pid);
                  const r = occ?.rating ?? -1;
                  if (r < weakestRating) {
                    weakestRating = r;
                    weakest = s;
                  }
                }
                setLineupSlot(weakest.idx, player.id);
                haptics.fire("success");
                return;
              }
              router.push("/lineup");
            }}
            style={({ pressed }) => [
              styles.addLineupBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="plus-circle" size={16} color={colors.primaryForeground} />
            <Text style={[styles.addLineupText, { color: colors.primaryForeground }]}>
              Add to starting lineup
            </Text>
          </Pressable>
        )}

        {!inLineup && (
          <Pressable
            onPress={async () => {
              haptics.fire("tap");
              const remembered = await getRememberedSalvage();
              if (
                remembered &&
                (remembered !== "evolution" || hasEvolutionTarget)
              ) {
                const ok = salvagePlayer(player.id, remembered);
                if (ok) {
                  haptics.fire("success");
                  router.back();
                } else {
                  haptics.fire("error");
                  if (Platform.OS === "web")
                    window.alert("Cannot salvage this player.");
                  else
                    Alert.alert("Cannot salvage", "Player may be in your lineup.");
                }
                return;
              }
              setSalvageOpen(true);
            }}
            onLongPress={() => {
              haptics.fire("tap");
              setSalvageOpen(true);
            }}
            delayLongPress={350}
            style={({ pressed }) => [
              styles.salvageBtn,
              { borderColor: colors.destructive, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="trash-2" size={14} color={colors.destructive} />
            <Text style={[styles.salvageText, { color: colors.destructive }]}>
              Salvage player
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <SalvagePicker
        visible={salvageOpen}
        options={{ player, hasEvolutionTarget }}
        onCancel={() => setSalvageOpen(false)}
        onConfirm={(mode: SalvageMode) => {
          setSalvageOpen(false);
          const ok = salvagePlayer(player.id, mode);
          if (ok) {
            haptics.fire("success");
            router.back();
          } else {
            haptics.fire("error");
            if (Platform.OS === "web") window.alert("Cannot salvage this player.");
            else Alert.alert("Cannot salvage", "Player may be in your lineup.");
          }
        }}
      />
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
    paddingBottom: 4,
  },
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 11, letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  heroRow: { flexDirection: "row", gap: 14, alignItems: "center", marginTop: 4 },
  bigBadge: {
    width: 84,
    height: 100,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bigBadgeRating: { fontSize: 38, fontWeight: "900", color: "#0A0E1A", fontFamily: "Inter_700Bold" },
  bigBadgeRole: { fontSize: 14, fontWeight: "700", color: "#0A0E1A", marginTop: -4, fontFamily: "Inter_600SemiBold" },
  playerName: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  playerMeta: { fontSize: 12, marginTop: 4, fontFamily: "Inter_500Medium" },
  rarityChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  ratingBlock: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  ratingRowTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  ratingNow: { fontSize: 28, fontFamily: "Inter_700Bold" },
  ratingCeil: { fontSize: 28, fontFamily: "Inter_700Bold" },
  ratingCeilLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  shardBar: { height: 8, borderRadius: 6, overflow: "hidden" },
  shardText: { fontSize: 11, marginTop: 4, fontFamily: "Inter_500Medium" },
  section: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
  },
  statsBox: { padding: 12, borderRadius: 14, borderWidth: 1, gap: 8 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statLabel: { width: 70, fontSize: 12, fontFamily: "Inter_500Medium" },
  statBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  statValue: { width: 28, textAlign: "right", fontSize: 13, fontFamily: "Inter_700Bold" },
  traitBox: { padding: 14, borderRadius: 14, borderWidth: 1 },
  traitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  traitText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  traitEmpty: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_500Medium" },
  traitBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  traitBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  upgradeBtn: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  lineupBadge: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  addLineupBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addLineupText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  salvageBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  salvageText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
