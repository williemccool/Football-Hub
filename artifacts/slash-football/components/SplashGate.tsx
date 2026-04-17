import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { sync } from "@/services";
import type { SyncSnapshot } from "@/services";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

/**
 * Wraps the app shell in a polished splash/loading/sync state. Holds the
 * splash visible until both the canonical state has been hydrated AND the
 * fade-out animation completes.
 */
export function SplashGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { loading } = useGame();
  const [snap, setSnap] = useState<SyncSnapshot>(sync.snapshot());
  const [hide, setHide] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => sync.subscribe(setSnap), []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  useEffect(() => {
    if (!loading) {
      // Small delay so users can read the sync line.
      const t = setTimeout(() => {
        Animated.timing(fade, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setHide(true));
      }, 250);
      return () => clearTimeout(t);
    }
  }, [loading, fade]);

  if (hide) return <>{children}</>;

  let line = "Loading club data";
  if (snap.status === "syncing") line = "Syncing club data";
  else if (snap.status === "migrating") line = "Migrating local save";
  else if (snap.status === "offline") line = "Offline — using local save";
  else if (snap.status === "error") line = "Sync error — using local save";

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={hide ? "none" : "auto"}>
      {!hide && children}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.background, opacity: fade },
        ]}
      >
        <LinearGradient
          colors={["#0A0E1A", "#0E1530", "#0A0E1A"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.center}>
          <Animated.View
            style={[
              styles.crest,
              {
                backgroundColor: colors.primary,
                transform: [{ scale }],
                shadowColor: colors.primary,
                shadowOpacity: 0.8,
                shadowRadius: 24,
              },
            ]}
          >
            <Feather name="zap" size={42} color="#0A0E1A" />
          </Animated.View>
          <Animated.View style={[styles.ring, { borderColor: colors.primary, opacity: glow }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>SLASH FOOTBALL</Text>
          <Text style={[styles.tag, { color: colors.mutedForeground }]}>
            scout · build · dominate
          </Text>
          <View style={styles.statusBar}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{line}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  crest: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    top: "50%",
    marginTop: -70,
  },
  title: {
    marginTop: 24,
    fontSize: 22,
    letterSpacing: 4,
    fontFamily: "Inter_700Bold",
  },
  tag: {
    marginTop: 6,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontFamily: "Inter_500Medium",
  },
  statusBar: {
    marginTop: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
});
