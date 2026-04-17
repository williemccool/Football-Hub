import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import { OBJECT_CONFIG, rewardFromCount, rollObject } from "@/lib/slashRewards";
import type { ObjectKind } from "@/lib/types";

const GAME_DURATION_MS = 20_000;
const SPAWN_MS = 460;
const TICK_MS = 33;
const FALL_SPEED = 180; // px/sec
const HIT_RADIUS = 38;

interface FallingObject {
  id: number;
  kind: ObjectKind;
  x: number;
  y: number;
  spawnedAt: number;
  alive: boolean;
}

export default function ScoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, spendTicket, applySlashReward } = useGame();
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboPeak, setComboPeak] = useState(1);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [collected, setCollected] = useState<Record<ObjectKind, number>>({
    shard: 0,
    shardRole: 0,
    trait: 0,
    coin: 0,
    catalyst: 0,
    golden: 0,
    trap: 0,
  });
  const [rewardSummary, setRewardSummary] = useState<ReturnType<typeof rewardFromCount> | null>(null);
  const [bonusPlayer, setBonusPlayer] = useState<string | null>(null);
  const [trail, setTrail] = useState<{ x: number; y: number; t: number }[]>([]);

  const dims = Dimensions.get("window");
  const playAreaHeight = dims.height - (insets.top + 80) - (insets.bottom + 60);
  const playAreaWidth = dims.width;

  const idCounter = useRef(0);
  const startTime = useRef(0);
  const lastSpawn = useRef(0);
  const lastSlashTime = useRef(0);
  const objectsRef = useRef<FallingObject[]>([]);
  const collectedRef = useRef(collected);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const comboPeakRef = useRef(1);
  const phaseRef = useRef<"intro" | "play" | "done">("intro");
  const trailIdRef = useRef(0);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);
  useEffect(() => {
    collectedRef.current = collected;
  }, [collected]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const startGame = () => {
    if (!spendTicket()) {
      router.back();
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startTime.current = Date.now();
    lastSpawn.current = Date.now();
    setPhase("play");
    setScore(0);
    setCombo(0);
    setComboPeak(1);
    scoreRef.current = 0;
    comboRef.current = 0;
    comboPeakRef.current = 1;
    setObjects([]);
    setCollected({ shard: 0, shardRole: 0, trait: 0, coin: 0, catalyst: 0, golden: 0, trap: 0 });
    setTimeLeft(GAME_DURATION_MS);
  };

  // Game loop
  useEffect(() => {
    if (phase !== "play") return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime.current;
      const remaining = Math.max(0, GAME_DURATION_MS - elapsed);
      setTimeLeft(remaining);

      // Spawn
      if (now - lastSpawn.current >= SPAWN_MS) {
        lastSpawn.current = now;
        const newObj: FallingObject = {
          id: idCounter.current++,
          kind: rollObject(),
          x: 30 + Math.random() * (playAreaWidth - 60),
          y: -40,
          spawnedAt: now,
          alive: true,
        };
        objectsRef.current = [...objectsRef.current, newObj];
        setObjects(objectsRef.current);
      }

      // Move & cull
      const dt = TICK_MS / 1000;
      const next: FallingObject[] = [];
      for (const o of objectsRef.current) {
        if (!o.alive) continue;
        const ny = o.y + FALL_SPEED * dt;
        if (ny > playAreaHeight + 40) continue;
        next.push({ ...o, y: ny });
      }
      objectsRef.current = next;
      setObjects(next);

      // Combo decay
      if (comboRef.current > 0 && now - lastSlashTime.current > 900) {
        comboRef.current = 0;
        setCombo(0);
      }

      // Trail decay
      const trailNow = now;
      setTrail((t) => t.filter((p) => trailNow - p.t < 220));

      // End game
      if (remaining <= 0) {
        endGame();
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [phase, playAreaHeight, playAreaWidth]);

  const endGame = () => {
    if (phaseRef.current === "done") return;
    phaseRef.current = "done";
    const reward = rewardFromCount(collectedRef.current, comboPeakRef.current);
    const created = applySlashReward(reward, scoreRef.current);
    setRewardSummary(reward);
    setBonusPlayer(created ? created.name : null);
    setPhase("done");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleHit = (obj: FallingObject) => {
    if (!obj.alive) return;
    obj.alive = false;
    const cfg = OBJECT_CONFIG[obj.kind];
    const isPositive = cfg.points > 0;
    if (isPositive) {
      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);
      if (newCombo > comboPeakRef.current) {
        comboPeakRef.current = newCombo;
        setComboPeak(newCombo);
      }
      const multiplier = 1 + Math.floor(newCombo / 3) * 0.5;
      const gained = Math.round(cfg.points * multiplier);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      lastSlashTime.current = Date.now();
      collectedRef.current = {
        ...collectedRef.current,
        [obj.kind]: collectedRef.current[obj.kind] + 1,
      };
      setCollected(collectedRef.current);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Trap
      comboRef.current = 0;
      setCombo(0);
      scoreRef.current = Math.max(0, scoreRef.current + cfg.points);
      setScore(scoreRef.current);
      collectedRef.current = {
        ...collectedRef.current,
        [obj.kind]: collectedRef.current[obj.kind] + 1,
      };
      setCollected(collectedRef.current);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const checkSlashAt = (x: number, y: number) => {
    for (const o of objectsRef.current) {
      if (!o.alive) continue;
      const dx = o.x - x;
      const dy = o.y - y;
      if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
        handleHit(o);
      }
    }
  };

  const playAreaTop = insets.top + 80;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => phaseRef.current === "play",
        onMoveShouldSetPanResponder: () => phaseRef.current === "play",
        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX;
          const y = evt.nativeEvent.locationY;
          trailIdRef.current++;
          setTrail((t) => [...t, { x, y, t: Date.now() }]);
          checkSlashAt(x, y);
        },
        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.locationX;
          const y = evt.nativeEvent.locationY;
          setTrail((t) => {
            const next = [...t, { x, y, t: Date.now() }];
            return next.slice(-14);
          });
          checkSlashAt(x, y);
        },
      }),
    [],
  );

  const seconds = Math.ceil(timeLeft / 1000);

  if (phase === "intro") {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={[styles.introWrap, { paddingTop: insets.top + 40 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Feather name="x" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.introTitle, { color: colors.foreground }]}>SLASH</Text>
          <Text style={[styles.introSubtitle, { color: colors.mutedForeground }]}>
            20 seconds. Slice positives, dodge red traps.
          </Text>

          <View style={styles.legendGrid}>
            {(["shard", "shardRole", "trait", "coin", "catalyst", "golden", "trap"] as ObjectKind[]).map((k) => {
              const c = OBJECT_CONFIG[k];
              return (
                <View
                  key={k}
                  style={[
                    styles.legendCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.legendOrb, { backgroundColor: c.color }]}>
                    <Feather name={c.icon as any} size={16} color="#0A0E1A" />
                  </View>
                  <Text style={[styles.legendLabel, { color: colors.foreground }]}>{c.label}</Text>
                  <Text
                    style={[
                      styles.legendPts,
                      { color: c.points >= 0 ? colors.primary : colors.destructive },
                    ]}
                  >
                    {c.points >= 0 ? `+${c.points}` : c.points}
                  </Text>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={startGame}
            disabled={state.tickets <= 0}
            style={({ pressed }) => [
              styles.startBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="play" size={18} color={colors.primaryForeground} />
            <Text style={[styles.startText, { color: colors.primaryForeground }]}>
              Start • Uses 1 ticket ({state.tickets} left)
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === "done" && rewardSummary) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={[styles.doneWrap, { paddingTop: insets.top + 40 }]}>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>RUN COMPLETE</Text>
          <View
            style={[
              styles.scoreCircle,
              { borderColor: colors.primary, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.scoreNum, { color: colors.primary }]}>{score}</Text>
            <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>SCORE</Text>
            <Text style={[styles.comboText, { color: colors.accent }]}>
              {comboPeak}× peak combo
            </Text>
          </View>

          <View style={styles.rewardList}>
            <RewardRow icon="dollar-sign" label="Coins" value={rewardSummary.coins} color={colors.accent} />
            <RewardRow icon="zap" label="Shards" value={rewardSummary.shards} color={colors.primary} />
            <RewardRow icon="shield" label="Role Shards" value={rewardSummary.roleShards.reduce((s, r) => s + r.amount, 0)} color="#41D7FF" />
            <RewardRow icon="flame" label="Trait Fragments" value={rewardSummary.traitFragments} color="#B36BFF" />
            <RewardRow icon="aperture" label="Catalysts" value={rewardSummary.catalysts} color="#FF8A3D" />
          </View>

          {bonusPlayer && (
            <View
              style={[
                styles.bonusCard,
                { backgroundColor: colors.card, borderColor: colors.primary },
              ]}
            >
              <Feather name="user-plus" size={18} color={colors.primary} />
              <Text style={[styles.bonusText, { color: colors.foreground }]}>
                New prospect signed: <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{bonusPlayer}</Text>
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.doneBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  flex: 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.doneBtnText, { color: colors.foreground }]}>Done</Text>
            </Pressable>
            {state.tickets > 0 && (
              <Pressable
                onPress={startGame}
                style={({ pressed }) => [
                  styles.doneBtn,
                  {
                    backgroundColor: colors.primary,
                    flex: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>
                  Run again
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  // PLAY
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0A0E1A", "#101830", "#0A0E1A"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.hudRow, { top: insets.top + 12 }]}>
        <View style={[styles.hudBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.hudLabel, { color: colors.mutedForeground }]}>SCORE</Text>
          <Text style={[styles.hudVal, { color: colors.primary }]}>{score}</Text>
        </View>
        <View style={[styles.timerBox, { borderColor: seconds <= 5 ? colors.destructive : colors.primary }]}>
          <Text
            style={[
              styles.timerVal,
              { color: seconds <= 5 ? colors.destructive : colors.foreground },
            ]}
          >
            {seconds}
          </Text>
        </View>
        <View style={[styles.hudBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.hudLabel, { color: colors.mutedForeground }]}>COMBO</Text>
          <Text style={[styles.hudVal, { color: colors.accent }]}>×{combo}</Text>
        </View>
      </View>

      <View
        style={[
          styles.playArea,
          { top: playAreaTop, height: playAreaHeight, width: playAreaWidth },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Trail */}
        {trail.map((p, i) => (
          <View
            key={`${p.t}-${i}`}
            pointerEvents="none"
            style={[
              styles.trailDot,
              {
                left: p.x - 6,
                top: p.y - 6,
                opacity: 0.15 + (i / trail.length) * 0.7,
                backgroundColor: colors.primary,
              },
            ]}
          />
        ))}
        {/* Objects */}
        {objects.map((o) => {
          const cfg = OBJECT_CONFIG[o.kind];
          return (
            <View
              key={o.id}
              pointerEvents="none"
              style={[
                styles.fallingObj,
                {
                  left: o.x - 26,
                  top: o.y - 26,
                  backgroundColor: cfg.color,
                  shadowColor: cfg.color,
                },
              ]}
            >
              <Feather name={cfg.icon as any} size={22} color="#0A0E1A" />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function RewardRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: number;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.rewardRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={[styles.rewardIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.rewardLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.rewardVal, { color: colors.foreground }]}>+{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  introWrap: { flex: 1, padding: 20 },
  introTitle: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    fontFamily: "Inter_700Bold",
  },
  introSubtitle: { fontSize: 14, marginTop: 6, fontFamily: "Inter_500Medium" },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 24,
  },
  legendCard: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  legendLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  legendPts: { fontSize: 12, fontFamily: "Inter_700Bold" },
  startBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
    paddingVertical: 16,
    borderRadius: 14,
  },
  startText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  hudRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 5,
  },
  hudBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
  },
  hudLabel: { fontSize: 9, letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  hudVal: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  timerBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  timerVal: { fontSize: 22, fontWeight: "900", fontFamily: "Inter_700Bold" },
  playArea: { position: "absolute", overflow: "hidden" },
  trailDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fallingObj: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 6,
  },
  doneWrap: { flex: 1, padding: 24, alignItems: "center" },
  doneTitle: {
    fontSize: 14,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  scoreCircle: {
    marginTop: 16,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: { fontSize: 56, fontWeight: "900", fontFamily: "Inter_700Bold" },
  scoreLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: "Inter_600SemiBold",
    marginTop: -4,
  },
  comboText: { fontSize: 12, marginTop: 4, fontFamily: "Inter_600SemiBold" },
  rewardList: { marginTop: 24, alignSelf: "stretch", gap: 6 },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  rewardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  rewardVal: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  bonusCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "stretch",
  },
  bonusText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
