import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { analytics, cache, flags, haptics } from "@/services";
import { ONBOARDING_KEY } from "@/constants/storageKeys";

interface Step {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
}

const FULL_STEPS: Step[] = [
  {
    icon: "zap",
    title: "Slash to scout",
    body: "Slice glowing footballs in the slash arena to earn coins, essence and player shards. Avoid hazards.",
  },
  {
    icon: "trending-up",
    title: "Upgrade your players",
    body: "Spend coins and shards in your squad to level up players, unlock traits, and raise their rating.",
  },
  {
    icon: "users",
    title: "Set your lineup",
    body: "Pick your starting XI from the squad screen. Tap a player to send them straight to the right slot.",
  },
  {
    icon: "play-circle",
    title: "Play matches",
    body: "Take on weekly fixtures. Match results feed into the league table and your seasonal trophy chase.",
  },
  {
    icon: "bar-chart-2",
    title: "Climb the league",
    body: "Win the title, scout new prospects, and start a fresh season. Your club is yours to build.",
  },
];

/** Compact 3-step variant used when `onboarding_speed=compact`. */
const COMPACT_STEPS: Step[] = [
  {
    icon: "zap",
    title: "Slash to scout",
    body: "Slice glowing footballs to earn coins, essence and player shards. Avoid hazards.",
  },
  {
    icon: "users",
    title: "Build your squad",
    body: "Upgrade players, set tactics, and pick your starting XI from the squad screen.",
  },
  {
    icon: "award",
    title: "Play the season",
    body: "Take on weekly fixtures, climb the league, win the title.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const [idx, setIdx] = useState(0);
  const fade = React.useRef(new Animated.Value(1)).current;

  const speed = flags.variant("onboarding_speed");
  const STEPS = speed === "compact" ? COMPACT_STEPS : FULL_STEPS;

  useEffect(() => {
    analytics.track("onboarding_started", { speed });
  }, [speed]);

  const finish = async (skipped: boolean) => {
    await cache.write(ONBOARDING_KEY, true);
    analytics.track(skipped ? "onboarding_skipped" : "onboarding_completed", {
      stepReached: idx + 1,
      totalSteps: STEPS.length,
      speed,
    });
    if (!skipped && state.clubName) {
      // Funnel marker: a finished onboarding with a club name is the
      // moment the player has effectively "created" their club.
      analytics.track("club_created", {
        clubName: state.clubName,
        managerLevel: state.managerLevel,
      });
    }
    router.replace("/(tabs)");
  };

  const next = () => {
    haptics.fire("tap");
    if (idx >= STEPS.length - 1) {
      finish(false);
      return;
    }
    Animated.timing(fade, {
      toValue: 0,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setIdx((i) => i + 1);
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  };

  const step = STEPS[idx]!;
  const isLast = idx === STEPS.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient colors={["#0A0E1A", "#0E1530", "#0A0E1A"]} style={StyleSheet.absoluteFill} />

      <View style={styles.skipRow}>
        <Pressable onPress={() => finish(true)} hitSlop={12}>
          <Text style={[styles.skip, { color: colors.mutedForeground }]}>Skip</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.body, { opacity: fade }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
          <Feather name={step.icon} size={36} color="#0A0E1A" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{step.title}</Text>
        <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{step.body}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === idx ? colors.primary : colors.border,
                  width: i === idx ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>
        <Pressable
          onPress={next}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.ctaText}>{isLast ? "Start playing" : "Next"}</Text>
          <Feather name={isLast ? "play" : "chevron-right"} size={16} color="#0A0E1A" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  skipRow: { alignItems: "flex-end", paddingTop: 8 },
  skip: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 1, textTransform: "uppercase" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.7,
    shadowRadius: 24,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, maxWidth: 320 },
  footer: { paddingBottom: 16, gap: 18 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0E1A", letterSpacing: 1 },
});
