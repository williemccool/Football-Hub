import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
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
import { motionForKind } from "@/lib/motion";
import { comboTier, OBJECT_CONFIG, rewardFromCount, rollObject } from "@/lib/slashRewards";
import { haptics } from "@/services";
import type { MotionKind, ObjectKind } from "@/lib/types";

const GAME_DURATION_MS = 20_000;
const TICK_MS = 33;
const HIT_RADIUS = 40;
const PRECISE_RADIUS = 30;

interface FallingObject {
  id: number;
  kind: ObjectKind;
  x: number;
  y: number;
  spawnedAt: number;
  alive: boolean;
  motion: MotionKind;
  vy: number;
  vx: number;
  amp: number;
  freq: number;
  baseX: number;
  rotation: number;
  rotSpeed: number;
}

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  born: number;
}

const HAZARD_KINDS: ObjectKind[] = ["trap", "injury", "burnout", "fakeAgent"];

export default function ScoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, spendTicket, applySlashReward } = useGame();
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboPeak, setComboPeak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const [collected, setCollected] = useState<Record<ObjectKind, number>>(zeroCounts());
  const [rewardSummary, setRewardSummary] = useState<ReturnType<typeof rewardFromCount> | null>(null);
  const [bonusPlayer, setBonusPlayer] = useState<string | null>(null);
  const [injuredName, setInjuredName] = useState<string | null>(null);
  const [moraleDelta, setMoraleDelta] = useState(0);
  const [trail, setTrail] = useState<{ x: number; y: number; t: number }[]>([]);
  const [tierFlash, setTierFlash] = useState<{ name: string; color: string; t: number } | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const tierAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  const dims = Dimensions.get("window");
  const playAreaHeight = dims.height - (insets.top + 90) - (insets.bottom + 60);
  const playAreaWidth = dims.width;

  const idCounter = useRef(0);
  const partIdCounter = useRef(0);
  const startTime = useRef(0);
  const lastSpawn = useRef(0);
  const lastSlashTime = useRef(0);
  const objectsRef = useRef<FallingObject[]>([]);
  const particlesRef = useRef<BurstParticle[]>([]);
  const collectedRef = useRef(collected);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const comboPeakRef = useRef(0);
  const phaseRef = useRef<"intro" | "play" | "done">("intro");
  const lastTierRef = useRef(0);
  const freezeUntilRef = useRef(0);

  useEffect(() => { objectsRef.current = objects; }, [objects]);
  useEffect(() => { collectedRef.current = collected; }, [collected]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { particlesRef.current = particles; }, [particles]);

  const startGame = () => {
    if (!spendTicket()) {
      router.back();
      return;
    }
    haptics.fire("comboUp");
    startTime.current = Date.now();
    lastSpawn.current = Date.now();
    lastTierRef.current = 0;
    freezeUntilRef.current = 0;
    setPhase("play");
    setScore(0);
    setCombo(0);
    setComboPeak(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    comboPeakRef.current = 0;
    setObjects([]);
    setParticles([]);
    setCollected(zeroCounts());
    setTimeLeft(GAME_DURATION_MS);
  };

  // Spawn rate function: ramps up
  const spawnIntervalForElapsed = (ms: number, density: number) => {
    const t = ms / 1000;
    let base: number;
    if (t < 5) base = 540;
    else if (t < 12) base = 380;
    else if (t < 18) base = 280;
    else base = 200;
    return Math.max(120, base / density);
  };

  // Burst clusters at specific moments
  const burstSpawn = (now: number, count: number) => {
    const objs: FallingObject[] = [];
    for (let i = 0; i < count; i++) {
      const kind = rollObject(now - startTime.current, state.tuning.hazardChance);
      const baseX = 30 + Math.random() * (playAreaWidth - 60);
      const m = motionForKind(kind, now - startTime.current, playAreaWidth);
      objs.push({
        id: idCounter.current++,
        kind,
        x: baseX,
        y: -50 - i * 70,
        spawnedAt: now + i * 70,
        alive: true,
        motion: m.motion,
        vy: m.vy,
        vx: m.vx,
        amp: m.amp,
        freq: m.freq,
        baseX,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 4,
      });
    }
    objectsRef.current = [...objectsRef.current, ...objs];
  };

  // Game loop
  useEffect(() => {
    if (phase !== "play") return;
    const interval = setInterval(() => {
      const now = Date.now();
      // Freeze frame check
      if (now < freezeUntilRef.current) {
        return;
      }
      const elapsed = now - startTime.current;
      const remaining = Math.max(0, GAME_DURATION_MS - elapsed);
      setTimeLeft(remaining);

      // Spawn based on dynamic rate
      const interv = spawnIntervalForElapsed(elapsed, state.tuning.spawnDensity);
      if (now - lastSpawn.current >= interv) {
        lastSpawn.current = now;
        // Occasional burst clusters in mid+late game
        const burstChance = elapsed < 5000 ? 0 : elapsed < 12000 ? 0.07 : 0.18;
        if (Math.random() < burstChance) {
          burstSpawn(now, 3 + Math.floor(Math.random() * 2));
        } else {
          const kind = rollObject(elapsed, state.tuning.hazardChance);
          const baseX = 30 + Math.random() * (playAreaWidth - 60);
          const m = motionForKind(kind, elapsed, playAreaWidth);
          const newObj: FallingObject = {
            id: idCounter.current++,
            kind,
            x: baseX,
            y: -40,
            spawnedAt: now,
            alive: true,
            motion: m.motion,
            vy: m.vy,
            vx: m.vx,
            amp: m.amp,
            freq: m.freq,
            baseX,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 3,
          };
          objectsRef.current = [...objectsRef.current, newObj];
        }
      }

      // Move & cull
      const dt = TICK_MS / 1000;
      const next: FallingObject[] = [];
      for (const o of objectsRef.current) {
        if (!o.alive) continue;
        const ny = o.y + o.vy * dt;
        let nx = o.x;
        if (o.motion === "curved") {
          const ageS = (now - o.spawnedAt) / 1000;
          nx = o.baseX + Math.sin(ageS * o.freq) * o.amp;
        } else if (o.vx !== 0) {
          nx = o.x + o.vx * dt;
          // bounce off walls
          if (nx < 24) { nx = 24; o.vx = Math.abs(o.vx); }
          if (nx > playAreaWidth - 24) { nx = playAreaWidth - 24; o.vx = -Math.abs(o.vx); }
        }
        if (ny > playAreaHeight + 40) continue;
        next.push({ ...o, x: nx, y: ny, rotation: o.rotation + o.rotSpeed });
      }
      objectsRef.current = next;
      setObjects(next);

      // Particle update
      const nextParts: BurstParticle[] = [];
      for (const p of particlesRef.current) {
        const age = now - p.born;
        if (age > p.life) continue;
        nextParts.push({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + 600 * dt });
      }
      particlesRef.current = nextParts;
      setParticles(nextParts);

      // Combo decay
      if (comboRef.current > 0 && now - lastSlashTime.current > 900) {
        comboRef.current = 0;
        setCombo(0);
      }

      // Trail decay
      setTrail((t) => t.filter((p) => now - p.t < 220));

      if (remaining <= 0) {
        endGame();
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [phase, playAreaHeight, playAreaWidth, state.tuning.spawnDensity, state.tuning.hazardChance]);

  const endGame = () => {
    if (phaseRef.current === "done") return;
    phaseRef.current = "done";
    const reward = rewardFromCount(collectedRef.current, comboPeakRef.current);
    const out = applySlashReward(reward, scoreRef.current, comboPeakRef.current);
    setRewardSummary(reward);
    setBonusPlayer(out.newPlayer ? out.newPlayer.name : null);
    setInjuredName(out.injuredPlayer ? out.injuredPlayer.name : null);
    setMoraleDelta(out.moraleDelta);
    setPhase("done");
    haptics.fire("success");
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const triggerFlash = () => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  const spawnBurst = (x: number, y: number, color: string, n = 8) => {
    const parts: BurstParticle[] = [];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n;
      const speed = 120 + Math.random() * 140;
      parts.push({
        id: partIdCounter.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        color,
        life: 450,
        born: Date.now(),
      });
    }
    particlesRef.current = [...particlesRef.current, ...parts].slice(-80);
    setParticles(particlesRef.current);
  };

  const handleHit = (obj: FallingObject) => {
    if (!obj.alive) return;
    obj.alive = false;
    const cfg = OBJECT_CONFIG[obj.kind];
    const isHazard = cfg.category === "hazard";
    if (!isHazard) {
      const newCombo = comboRef.current + 1 + (obj.kind === "comboOrb" ? 2 : 0);
      comboRef.current = newCombo;
      setCombo(newCombo);
      if (newCombo > comboPeakRef.current) {
        comboPeakRef.current = newCombo;
        setComboPeak(newCombo);
      }
      const tier = comboTier(newCombo).tier;
      const multiplier = 1 + tier * 0.4;
      const gained = Math.round(cfg.points * multiplier);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      lastSlashTime.current = Date.now();
      collectedRef.current = {
        ...collectedRef.current,
        [obj.kind]: collectedRef.current[obj.kind] + 1,
      };
      setCollected(collectedRef.current);
      spawnBurst(obj.x, obj.y, cfg.color, obj.kind === "golden" ? 16 : obj.kind === "catalyst" ? 12 : 8);

      // Tier change feedback
      if (tier > lastTierRef.current && tier > 0) {
        lastTierRef.current = tier;
        const t = comboTier(newCombo);
        setTierFlash({ name: t.name, color: t.color, t: Date.now() });
        tierAnim.setValue(0);
        Animated.spring(tierAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
        setTimeout(() => setTierFlash((cur) => (cur && Date.now() - cur.t > 800 ? null : cur)), 1100);
        haptics.fire("comboUp");
      }

      // Special effects for premium objects
      if (obj.kind === "golden") {
        triggerFlash();
        triggerShake();
        freezeUntilRef.current = Date.now() + 220;
        haptics.fire("golden");
      } else if (obj.kind === "catalyst") {
        triggerFlash();
        haptics.fire("comboUp");
      } else {
        haptics.fire("slice");
      }
    } else {
      // Hazard hit
      comboRef.current = 0;
      setCombo(0);
      lastTierRef.current = 0;
      scoreRef.current = Math.max(0, scoreRef.current + cfg.points);
      setScore(scoreRef.current);
      collectedRef.current = {
        ...collectedRef.current,
        [obj.kind]: collectedRef.current[obj.kind] + 1,
      };
      setCollected(collectedRef.current);
      spawnBurst(obj.x, obj.y, cfg.color, 10);
      triggerShake();
      haptics.fire("hazard");
    }
  };

  const checkSlashAt = (x: number, y: number) => {
    for (const o of objectsRef.current) {
      if (!o.alive) continue;
      const radius = o.kind === "catalyst" || o.kind === "golden" ? PRECISE_RADIUS : HIT_RADIUS;
      const dx = o.x - x;
      const dy = o.y - y;
      if (dx * dx + dy * dy < radius * radius) {
        handleHit(o);
      }
    }
  };

  const playAreaTop = insets.top + 90;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => phaseRef.current === "play",
        onMoveShouldSetPanResponder: () => phaseRef.current === "play",
        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX;
          const y = evt.nativeEvent.locationY;
          setTrail((t) => [...t, { x, y, t: Date.now() }]);
          checkSlashAt(x, y);
        },
        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.locationX;
          const y = evt.nativeEvent.locationY;
          setTrail((t) => {
            const next = [...t, { x, y, t: Date.now() }];
            return next.slice(-16);
          });
          checkSlashAt(x, y);
        },
      }),
    [],
  );

  const seconds = Math.ceil(timeLeft / 1000);
  const tier = comboTier(combo);

  if (phase === "intro") {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.introWrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Feather name="x" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.introTitle, { color: colors.foreground }]}>SLASH</Text>
          <Text style={[styles.introSubtitle, { color: colors.mutedForeground }]}>
            20s. Slice positives, dodge red traps. Build combos for huge multipliers.
          </Text>

          <View style={styles.legendSection}>
            <Text style={[styles.legendHeading, { color: colors.primary }]}>POSITIVE</Text>
            <View style={styles.legendGrid}>
              {(["shard", "shardRole", "trait", "coin", "catalyst", "golden"] as ObjectKind[]).map((k) =>
                <Legend key={k} kind={k} colors={colors} />,
              )}
            </View>
            <Text style={[styles.legendHeading, { color: "#5BFFEA", marginTop: 12 }]}>UTILITY</Text>
            <View style={styles.legendGrid}>
              {(["comboOrb", "scoutIntel", "physio", "morale"] as ObjectKind[]).map((k) =>
                <Legend key={k} kind={k} colors={colors} />,
              )}
            </View>
            <Text style={[styles.legendHeading, { color: colors.destructive, marginTop: 12 }]}>HAZARDS — DODGE</Text>
            <View style={styles.legendGrid}>
              {(["trap", "injury", "burnout", "fakeAgent"] as ObjectKind[]).map((k) =>
                <Legend key={k} kind={k} colors={colors} />,
              )}
            </View>
          </View>

          {state.scoutIntelRole && (
            <View style={[styles.intelBanner, { borderColor: "#5BFFEA" }]}>
              <Feather name="eye" size={14} color="#5BFFEA" />
              <Text style={[styles.intelText, { color: colors.foreground }]}>
                Scout Intel active — next shards target <Text style={{ color: "#5BFFEA", fontFamily: "Inter_700Bold" }}>{state.scoutIntelRole}</Text>
              </Text>
            </View>
          )}

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
        </ScrollView>
      </View>
    );
  }

  if (phase === "done" && rewardSummary) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.doneWrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>RUN COMPLETE</Text>
          <View
            style={[
              styles.scoreCircle,
              { borderColor: colors.primary, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.scoreNum, { color: colors.primary }]}>{score}</Text>
            <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>SCORE</Text>
            <Text style={[styles.comboText, { color: comboTier(comboPeak).color || colors.accent }]}>
              {comboPeak}× peak{comboPeak >= 3 ? ` • ${comboTier(comboPeak).name}` : ""}
            </Text>
          </View>

          <View style={styles.rewardList}>
            <RewardRow icon="dollar-sign" label="Coins" value={rewardSummary.coins} color={colors.accent} />
            <RewardRow icon="zap" label="Shards" value={rewardSummary.shards} color={colors.primary} />
            <RewardRow icon="shield" label="Role Shards" value={rewardSummary.roleShards.reduce((s, r) => s + r.amount, 0)} color="#41D7FF" />
            <RewardRow icon="hexagon" label="Trait Fragments" value={rewardSummary.traitFragments} color="#B36BFF" />
            <RewardRow icon="aperture" label="Catalysts" value={rewardSummary.catalysts} color="#FF8A3D" />
            {rewardSummary.essence > 0 && <RewardRow icon="droplet" label="Essence" value={rewardSummary.essence} color="#A0F0FF" />}
            {moraleDelta !== 0 && <RewardRow icon="smile" label={moraleDelta > 0 ? "Morale +" : "Morale −"} value={Math.abs(moraleDelta)} color={moraleDelta > 0 ? "#FF8AC2" : colors.destructive} />}
            {rewardSummary.physioCount > 0 && <RewardRow icon="plus-square" label="Physio Used" value={rewardSummary.physioCount} color="#A0F0FF" />}
            {rewardSummary.scoutIntelRole && <RewardRow icon="eye" label={`Intel: ${rewardSummary.scoutIntelRole}`} value={1} color="#5BFFEA" />}
          </View>

          {rewardSummary.injuries > 0 && injuredName && (
            <View style={[styles.warnCard, { borderColor: colors.destructive, backgroundColor: colors.card }]}>
              <Feather name="alert-triangle" size={16} color={colors.destructive} />
              <Text style={[styles.warnText, { color: colors.foreground }]}>
                <Text style={{ color: colors.destructive, fontFamily: "Inter_700Bold" }}>{injuredName}</Text> picked up an injury and will miss the next match.
              </Text>
            </View>
          )}
          {rewardSummary.burnouts > 0 && (
            <View style={[styles.warnCard, { borderColor: "#C84BFF", backgroundColor: colors.card }]}>
              <Feather name="battery-charging" size={16} color="#C84BFF" />
              <Text style={[styles.warnText, { color: colors.foreground }]}>
                Burnout drained manager XP this run.
              </Text>
            </View>
          )}
          {rewardSummary.fakeAgents > 0 && (
            <View style={[styles.warnCard, { borderColor: "#FFA844", backgroundColor: colors.card }]}>
              <Feather name="user-x" size={16} color="#FFA844" />
              <Text style={[styles.warnText, { color: colors.foreground }]}>
                Fake agent files converted some rewards into essence.
              </Text>
            </View>
          )}

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
        </ScrollView>
      </View>
    );
  }

  // PLAY
  return (
    <Animated.View style={[styles.fill, { backgroundColor: colors.background, transform: [{ translateX: shakeAnim }] }]}>
      <LinearGradient
        colors={["#0A0E1A", "#101830", "#0A0E1A"]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#FFE066", opacity: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }) },
        ]}
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
        <View style={[styles.hudBox, { backgroundColor: colors.card, borderColor: tier.tier > 0 ? tier.color : colors.border }]}>
          <Text style={[styles.hudLabel, { color: colors.mutedForeground }]}>COMBO</Text>
          <Text style={[styles.hudVal, { color: tier.tier > 0 ? tier.color : colors.accent }]}>×{combo}</Text>
        </View>
      </View>

      {/* Combo meter */}
      <View style={[styles.comboMeterWrap, { top: insets.top + 64 }]}>
        <View style={[styles.comboMeter, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <View
            style={{
              height: "100%",
              width: `${Math.min(100, (combo / 15) * 100)}%`,
              backgroundColor: tier.color || colors.primary,
              borderRadius: 4,
            }}
          />
        </View>
        {tier.tier > 0 && (
          <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
        )}
      </View>

      {/* Tier flash */}
      {tierFlash && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tierFlash,
            {
              top: insets.top + 120,
              opacity: tierAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0.6] }),
              transform: [
                { scale: tierAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] }) },
              ],
            },
          ]}
        >
          <Text style={[styles.tierFlashText, { color: tierFlash.color, textShadowColor: tierFlash.color }]}>
            {tierFlash.name}
          </Text>
        </Animated.View>
      )}

      <View
        style={[
          styles.playArea,
          { top: playAreaTop, height: playAreaHeight, width: playAreaWidth },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Particles */}
        {particles.map((p) => (
          <View
            key={p.id}
            pointerEvents="none"
            style={[
              styles.particle,
              {
                left: p.x - 3,
                top: p.y - 3,
                backgroundColor: p.color,
                opacity: 0.85 - (Date.now() - p.born) / p.life,
              },
            ]}
          />
        ))}
        {/* Trail */}
        {trail.map((p, i) => (
          <View
            key={`${p.t}-${i}`}
            pointerEvents="none"
            style={[
              styles.trailDot,
              {
                left: p.x - 7,
                top: p.y - 7,
                opacity: 0.15 + (i / trail.length) * 0.7,
                backgroundColor: tier.tier > 0 ? tier.color : colors.primary,
                width: 14 - (trail.length - i) * 0.4,
                height: 14 - (trail.length - i) * 0.4,
              },
            ]}
          />
        ))}
        {/* Objects */}
        {objects.map((o) => {
          const cfg = OBJECT_CONFIG[o.kind];
          const isHazard = HAZARD_KINDS.includes(o.kind);
          const size = cfg.size ?? (isHazard ? 50 : 54);
          return (
            <View
              key={o.id}
              pointerEvents="none"
              style={[
                styles.fallingObj,
                {
                  left: o.x - size / 2,
                  top: o.y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: cfg.color,
                  shadowColor: cfg.color,
                  borderWidth: o.kind === "golden" ? 2 : isHazard ? 1.5 : 0,
                  borderColor: o.kind === "golden" ? "#0A0E1A" : isHazard ? "#0A0E1A" : "transparent",
                  transform: [{ rotate: `${o.rotation}deg` }],
                },
              ]}
            >
              <Feather name={cfg.icon as any} size={isHazard ? 22 : o.kind === "golden" ? 24 : 22} color="#0A0E1A" />
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

function Legend({ kind, colors }: { kind: ObjectKind; colors: ReturnType<typeof useColors> }) {
  const c = OBJECT_CONFIG[kind];
  const isHazard = c.category === "hazard";
  return (
    <View
      style={[
        styles.legendCard,
        { backgroundColor: colors.card, borderColor: isHazard ? colors.destructive + "55" : colors.border },
      ]}
    >
      <View style={[styles.legendOrb, { backgroundColor: c.color }]}>
        <Feather name={c.icon as any} size={14} color="#0A0E1A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.legendLabel, { color: colors.foreground }]}>{c.label}</Text>
        <Text style={[styles.legendDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{c.description}</Text>
      </View>
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

function zeroCounts(): Record<ObjectKind, number> {
  return {
    shard: 0,
    shardRole: 0,
    trait: 0,
    coin: 0,
    catalyst: 0,
    golden: 0,
    comboOrb: 0,
    scoutIntel: 0,
    physio: 0,
    morale: 0,
    trap: 0,
    injury: 0,
    burnout: 0,
    fakeAgent: 0,
  };
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
  introWrap: { padding: 20 },
  introTitle: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    fontFamily: "Inter_700Bold",
  },
  introSubtitle: { fontSize: 14, marginTop: 6, fontFamily: "Inter_500Medium" },
  legendSection: { marginTop: 18 },
  legendHeading: { fontSize: 11, letterSpacing: 1.2, fontFamily: "Inter_700Bold", marginBottom: 6 },
  legendGrid: { gap: 6 },
  legendCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  legendLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  legendDesc: { fontSize: 10, marginTop: 1, fontFamily: "Inter_400Regular" },
  legendPts: { fontSize: 12, fontFamily: "Inter_700Bold", minWidth: 40, textAlign: "right" },
  intelBanner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  intelText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  startBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
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
  comboMeterWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 5,
    alignItems: "center",
  },
  comboMeter: {
    width: "100%",
    height: 6,
    borderRadius: 4,
    overflow: "hidden",
  },
  tierName: { fontSize: 11, marginTop: 4, letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  tierFlash: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  tierFlashText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  playArea: { position: "absolute", overflow: "hidden" },
  trailDot: {
    position: "absolute",
    borderRadius: 7,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  fallingObj: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    elevation: 8,
  },
  doneWrap: { padding: 24, alignItems: "center" },
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
  rewardList: { marginTop: 20, alignSelf: "stretch", gap: 6 },
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
  warnCard: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "stretch",
  },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
