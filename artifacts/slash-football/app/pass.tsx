import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { getCosmetic } from "@/lib/cosmetics";
import {
  applyGenerosity,
  MAX_TIER,
  PASS_TIERS,
  type PassReward,
  progressInTier,
} from "@/lib/seasonPass";
import { analytics, flags, haptics } from "@/services";

export default function PassScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, claimPassReward, purchasePassPremium } = useGame();
  const top = Platform.OS === "web" ? 24 : insets.top + 12;

  const passVisible = flags.bool("pass_visible");
  const generosity = (flags.variant("pass_reward_generosity") as
    | "lean"
    | "default"
    | "generous") ?? "default";

  useEffect(() => {
    analytics.track("pass_viewed", {
      premiumOwned: state.seasonPass.premiumOwned,
      season: state.season.number,
      seasonXp: state.seasonXp,
    });
  }, [state.seasonPass.premiumOwned, state.season.number, state.seasonXp]);

  const progress = progressInTier(state.seasonXp);
  const claimedFree = new Set(state.seasonPass.claimedFree);
  const claimedPremium = new Set(state.seasonPass.claimedPremium);

  if (!passVisible) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: top }]}>
        <Header onClose={() => router.back()} title="Season Pass" />
        <View style={styles.emptyWrap}>
          <Feather name="lock" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Pass unavailable
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            The season pass is currently turned off. Check back soon.
          </Text>
        </View>
      </View>
    );
  }

  function tryClaim(tier: number, track: "free" | "premium") {
    haptics.fire("tap");
    claimPassReward(tier, track);
  }

  function tryUpgrade() {
    haptics.fire("tap");
    purchasePassPremium();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Season {state.season.number} Pass
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tierLabel, { color: colors.mutedForeground }]}>
            CURRENT TIER
          </Text>
          <Text style={[styles.tierBig, { color: colors.foreground }]}>
            {progress.tier} <Text style={[styles.tierMax, { color: colors.mutedForeground }]}>/ {MAX_TIER}</Text>
          </Text>
          {progress.nextTier ? (
            <>
              <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}>
                <View
                  style={{
                    width: `${Math.min(100, progress.pct * 100)}%`,
                    height: "100%",
                    backgroundColor: colors.primary,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text style={[styles.tierSub, { color: colors.mutedForeground }]}>
                {progress.current} / {progress.required} XP to tier {progress.nextTier}
              </Text>
            </>
          ) : (
            <Text style={[styles.tierSub, { color: colors.primary }]}>Pass maxed out!</Text>
          )}
        </View>
      </View>

      {!state.seasonPass.premiumOwned && (
        <Pressable
          onPress={tryUpgrade}
          style={({ pressed }) => [
            styles.premiumBanner,
            { borderColor: "#FFD27A", opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <LinearGradient
            colors={["#FFE066" + "33", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Feather name="award" size={18} color="#FFD27A" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.premiumTitle, { color: colors.foreground }]}>
              Unlock the premium track
            </Text>
            <Text style={[styles.premiumSub, { color: colors.mutedForeground }]}>
              Cosmetic-led rewards on every tier you've already earned. No power.
            </Text>
          </View>
          <View style={[styles.premiumCta, { backgroundColor: "#FFD27A" }]}>
            <Text style={styles.premiumCtaText}>Activate</Text>
          </View>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <View style={styles.colHeader}>
          <View style={styles.tierColHeader}>
            <Text style={[styles.colHeaderText, { color: colors.mutedForeground }]}>TIER</Text>
          </View>
          <Text style={[styles.colHeaderText, { color: colors.mutedForeground, flex: 1 }]}>
            FREE
          </Text>
          <Text
            style={[
              styles.colHeaderText,
              { color: state.seasonPass.premiumOwned ? "#FFD27A" : colors.mutedForeground, flex: 1 },
            ]}
          >
            PREMIUM
          </Text>
        </View>

        {PASS_TIERS.map((t) => {
          const unlocked = state.seasonXp >= t.xpRequired;
          const freeReward = t.freeReward
            ? applyGenerosity(t.freeReward, generosity)
            : null;
          const premiumReward = t.premiumReward
            ? applyGenerosity(t.premiumReward, generosity)
            : null;
          return (
            <View
              key={t.tier}
              style={[
                styles.tierRow,
                {
                  backgroundColor: colors.card,
                  borderColor: unlocked ? colors.primary + "55" : colors.border,
                },
              ]}
            >
              <View style={styles.tierColIndex}>
                <Text style={[styles.tierIdx, { color: unlocked ? colors.primary : colors.mutedForeground }]}>
                  {t.tier}
                </Text>
                <Text style={[styles.tierXp, { color: colors.mutedForeground }]}>
                  {t.xpRequired} XP
                </Text>
              </View>

              <RewardSlot
                reward={freeReward}
                claimed={claimedFree.has(t.tier)}
                unlocked={unlocked}
                onClaim={() => tryClaim(t.tier, "free")}
                tone={colors.primary}
              />

              <RewardSlot
                reward={premiumReward}
                claimed={claimedPremium.has(t.tier)}
                unlocked={unlocked && state.seasonPass.premiumOwned}
                lockedReason={
                  unlocked && !state.seasonPass.premiumOwned ? "Upgrade required" : undefined
                }
                onClaim={() => tryClaim(t.tier, "premium")}
                tone="#FFD27A"
              />
            </View>
          );
        })}

        <Text style={[styles.fairnessNote, { color: colors.mutedForeground }]}>
          Premium track is cosmetics-led. No reward grants player rating, ticket caps, or
          matchday advantages.
        </Text>
      </ScrollView>
    </View>
  );
}

function RewardSlot({
  reward,
  claimed,
  unlocked,
  lockedReason,
  onClaim,
  tone,
}: {
  reward: PassReward | null;
  claimed: boolean;
  unlocked: boolean;
  lockedReason?: string;
  onClaim: () => void;
  tone: string;
}) {
  const colors = useColors();
  if (!reward) {
    return (
      <View style={[styles.rewardSlot, { borderColor: colors.border }]}>
        <Text style={[styles.rewardEmpty, { color: colors.mutedForeground }]}>—</Text>
      </View>
    );
  }
  const cosmetic = reward.kind === "cosmetic" && reward.cosmeticId
    ? getCosmetic(reward.cosmeticId)
    : null;
  const label = cosmetic ? cosmetic.name : reward.label;

  return (
    <View
      style={[
        styles.rewardSlot,
        {
          borderColor: claimed ? colors.border : unlocked ? tone : colors.border,
          opacity: claimed ? 0.55 : 1,
        },
      ]}
    >
      <View style={styles.rewardHeader}>
        <Feather
          name={iconForReward(reward.kind)}
          size={12}
          color={claimed ? colors.mutedForeground : tone}
        />
        <Text style={[styles.rewardLabel, { color: colors.foreground }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {claimed ? (
        <View style={[styles.claimedChip, { borderColor: colors.border }]}>
          <Feather name="check" size={11} color={colors.mutedForeground} />
          <Text style={[styles.claimedText, { color: colors.mutedForeground }]}>Claimed</Text>
        </View>
      ) : unlocked ? (
        <Pressable
          onPress={onClaim}
          style={({ pressed }) => [
            styles.claimBtn,
            { backgroundColor: tone, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.claimBtnText}>Claim</Text>
        </Pressable>
      ) : (
        <Text style={[styles.lockedText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {lockedReason ?? "Locked"}
        </Text>
      )}
    </View>
  );
}

function Header({ onClose, title }: { onClose: () => void; title: string }) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <Pressable onPress={onClose} hitSlop={10}>
        <Feather name="chevron-down" size={24} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

function iconForReward(kind: PassReward["kind"]): React.ComponentProps<typeof Feather>["name"] {
  switch (kind) {
    case "coins":
      return "dollar-sign";
    case "gems":
      return "hexagon";
    case "essence":
      return "droplet";
    case "ticket":
      return "tag";
    case "trait_fragment":
      return "zap";
    case "catalyst":
      return "circle";
    case "cosmetic":
      return "package";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  progressCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  tierLabel: { fontSize: 9, letterSpacing: 0.6, fontFamily: "Inter_600SemiBold" },
  tierBig: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 2 },
  tierMax: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tierSub: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 6 },
  barTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  premiumBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  premiumTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  premiumSub: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  premiumCta: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  premiumCtaText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0A0E1A" },
  colHeader: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingBottom: 6,
    gap: 8,
  },
  tierColHeader: { width: 56 },
  colHeaderText: { fontSize: 9, letterSpacing: 0.6, fontFamily: "Inter_600SemiBold" },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  tierColIndex: {
    width: 56,
    alignItems: "center",
  },
  tierIdx: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tierXp: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 2 },
  rewardSlot: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    minHeight: 64,
  },
  rewardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  rewardLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", flex: 1 },
  rewardEmpty: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 14 },
  claimBtn: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  claimBtnText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0A0E1A" },
  claimedChip: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
  },
  claimedText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  lockedText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
  },
  fairnessNote: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
    flex: 1,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyBody: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", maxWidth: 260 },
});
