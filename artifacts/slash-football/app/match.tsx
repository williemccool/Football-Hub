import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SentimentPrompt } from "@/components/SentimentPrompt";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import type { MatchEvent, MatchResult } from "@/lib/types";

export default function MatchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, playFixture } = useGame();
  const [result, setResult] = useState<MatchResult | null>(null);
  const [shownEvents, setShownEvents] = useState<MatchEvent[]>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [showSentiment, setShowSentiment] = useState(false);
  const [tab, setTab] = useState<"reel" | "analysis">("reel");

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setShowSentiment(true), 1200);
      return () => clearTimeout(t);
    }
  }, [done]);
  const scrollRef = useRef<ScrollView>(null);

  const opponent = result?.opponent ?? state.upcomingOpponent.name;

  useEffect(() => {
    const r = playFixture();
    setResult(r);
  }, []);

  const startPlayback = () => {
    if (!result) return;
    setPlaying(true);
    setShownEvents([]);
    setHomeScore(0);
    setAwayScore(0);
    setCurrentMinute(0);
    let i = 0;
    let lastMinute = 0;
    const tick = () => {
      if (i >= result.events.length) {
        setDone(true);
        setPlaying(false);
        setCurrentMinute(90);
        return;
      }
      const e = result.events[i]!;
      const stepMinute = () => {
        if (lastMinute < e.minute) {
          lastMinute++;
          setCurrentMinute(lastMinute);
          setTimeout(stepMinute, 12);
        } else {
          setShownEvents((s) => [...s, e]);
          if (e.kind === "goal") setHomeScore((s) => s + 1);
          if (e.kind === "concede") setAwayScore((s) => s + 1);
          setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
          }, 50);
          i++;
          setTimeout(tick, e.kind === "goal" || e.kind === "concede" ? 700 : 220);
        }
      };
      stepMinute();
    };
    tick();
  };

  const skipToEnd = () => {
    if (!result) return;
    setShownEvents(result.events);
    setHomeScore(result.homeScore);
    setAwayScore(result.awayScore);
    setCurrentMinute(90);
    setDone(true);
    setPlaying(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  if (!result) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
          Loading match…
        </Text>
      </View>
    );
  }

  const win = result.homeScore > result.awayScore;
  const draw = result.homeScore === result.awayScore;
  const analysis = result.analysis;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0A0E1A", "#0F1828"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>
          {result.matchday ? `MATCHDAY ${result.matchday}` : "MATCHDAY"}
        </Text>
        <Pressable
          onPress={done ? () => router.back() : skipToEnd}
          style={styles.iconBtn}
        >
          <Feather
            name={done ? "check" : "skip-forward"}
            size={20}
            color={colors.foreground}
          />
        </Pressable>
      </View>

      <View style={styles.scoreboard}>
        <View style={styles.team}>
          <View style={[styles.crest, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={18} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={1}>
            {state.clubName}
          </Text>
          <Text style={[styles.teamRating, { color: colors.primary }]}>
            {result.ratingHome}
          </Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={[styles.scoreText, { color: colors.foreground }]}>
            {homeScore} – {awayScore}
          </Text>
          <View style={[styles.minuteChip, { borderColor: colors.border }]}>
            <Text style={[styles.minuteText, { color: colors.accent }]}>
              {currentMinute}'
            </Text>
          </View>
        </View>
        <View style={styles.team}>
          <View style={[styles.crest, { backgroundColor: colors.destructive }]}>
            <Feather name="shield" size={18} color="#fff" />
          </View>
          <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={1}>
            {opponent}
          </Text>
          <Text style={[styles.teamRating, { color: colors.destructive }]}>
            {result.ratingAway}
          </Text>
        </View>
      </View>

      {/* Tabs only after match is done */}
      {done && analysis && (
        <View style={styles.tabRow}>
          <TabBtn active={tab === "reel"} onPress={() => setTab("reel")} label="Highlights" colors={colors} />
          <TabBtn active={tab === "analysis"} onPress={() => setTab("analysis")} label="Analysis" colors={colors} />
        </View>
      )}

      <View
        style={[
          styles.timelineWrap,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {tab === "reel" ? (
          <>
            <View style={styles.timelineHeader}>
              <Feather name="play-circle" size={14} color={colors.primary} />
              <Text style={[styles.timelineTitle, { color: colors.foreground }]}>
                Highlight reel
              </Text>
            </View>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ paddingVertical: 4 }}
              showsVerticalScrollIndicator={false}
            >
              {shownEvents.length === 0 && !playing && (
                <View style={styles.emptyTimeline}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                    Press play to watch the match unfold.
                  </Text>
                </View>
              )}
              {shownEvents.map((e, idx) => (
                <EventRow key={idx} event={e} />
              ))}
            </ScrollView>
          </>
        ) : analysis ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.analysisHeader}>
              <Feather name="bar-chart-2" size={14} color={colors.primary} />
              <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Post-match analysis</Text>
            </View>

            <Text style={[styles.verdict, { color: colors.foreground }]}>{analysis.verdict}</Text>

            {/* Stats bars */}
            <StatBar
              label="Possession"
              homeVal={analysis.homeStats.possession}
              awayVal={analysis.awayStats.possession}
              colors={colors}
              suffix="%"
            />
            <StatBar
              label="Shots"
              homeVal={analysis.homeStats.shots}
              awayVal={analysis.awayStats.shots}
              colors={colors}
            />
            <StatBar
              label="Big chances"
              homeVal={analysis.homeStats.bigChances}
              awayVal={analysis.awayStats.bigChances}
              colors={colors}
            />

            {analysis.strongestPlayer && (
              <View style={[styles.insightCard, { borderColor: colors.primary, backgroundColor: "rgba(0,255,136,0.06)" }]}>
                <Feather name="star" size={14} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightLabel, { color: colors.primary }]}>STAR PERFORMER</Text>
                  <Text style={[styles.insightText, { color: colors.foreground }]}>{analysis.strongestPlayer}</Text>
                </View>
              </View>
            )}

            {analysis.weakestArea && (
              <View style={[styles.insightCard, { borderColor: colors.destructive, backgroundColor: "rgba(255,59,92,0.06)" }]}>
                <Feather name="alert-triangle" size={14} color={colors.destructive} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightLabel, { color: colors.destructive }]}>WEAKEST AREA</Text>
                  <Text style={[styles.insightText, { color: colors.foreground }]}>{analysis.weakestArea}</Text>
                </View>
              </View>
            )}

            <View style={[styles.insightCard, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" }]}>
              <Feather name="message-square" size={14} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightLabel, { color: colors.accent }]}>TACTICAL NOTE</Text>
                <Text style={[styles.insightText, { color: colors.foreground }]}>{analysis.tacticalNote}</Text>
              </View>
            </View>

            <View style={[styles.insightCard, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" }]}>
              <Feather name="compass" size={14} color="#5BFFEA" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightLabel, { color: "#5BFFEA" }]}>SUGGESTION</Text>
                <Text style={[styles.insightText, { color: colors.foreground }]}>{analysis.suggestion}</Text>
              </View>
            </View>
          </ScrollView>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {!playing && !done && (
          <Pressable
            onPress={startPlayback}
            style={({ pressed }) => [
              styles.bigBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="play" size={18} color={colors.primaryForeground} />
            <Text style={[styles.bigBtnText, { color: colors.primaryForeground }]}>
              Play match
            </Text>
          </Pressable>
        )}
        {playing && (
          <View style={[styles.playingBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View
              style={[
                styles.playingFill,
                {
                  width: `${(currentMinute / 90) * 100}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
            <Text style={[styles.playingText, { color: colors.foreground }]}>
              Live • {currentMinute}'
            </Text>
          </View>
        )}
        {done && (
          <View style={{ gap: 10 }}>
            <View
              style={[
                styles.resultBanner,
                {
                  backgroundColor: win
                    ? colors.primary
                    : draw
                    ? colors.accent
                    : colors.destructive,
                },
              ]}
            >
              <Text style={styles.resultBannerText}>
                {win ? "VICTORY" : draw ? "DRAW" : "DEFEAT"} • +{result.rewards.coins} coins • +{result.rewards.xp} XP
              </Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.bigBtn,
                { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.bigBtnText, { color: colors.foreground }]}>
                Back to hub
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      <SentimentPrompt
        surface="match_completed"
        visible={showSentiment}
        onClose={() => setShowSentiment(false)}
        context={{
          opponent,
          homeScore: result?.homeScore ?? 0,
          awayScore: result?.awayScore ?? 0,
        }}
      />
    </View>
  );
}

function TabBtn({ active, onPress, label, colors }: { active: boolean; onPress: () => void; label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabBtn,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={{ color: active ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_700Bold", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatBar({ label, homeVal, awayVal, colors, suffix = "" }: { label: string; homeVal: number; awayVal: number; colors: ReturnType<typeof useColors>; suffix?: string }) {
  const total = Math.max(1, homeVal + awayVal);
  const homePct = (homeVal / total) * 100;
  return (
    <View style={styles.statBarRow}>
      <Text style={[styles.statBarSide, { color: colors.primary, textAlign: "right" }]}>{homeVal}{suffix}</Text>
      <View style={styles.statBarMid}>
        <Text style={[styles.statBarLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <View style={[styles.statBarBg, { backgroundColor: "rgba(255,59,92,0.25)" }]}>
          <View style={{ width: `${homePct}%`, height: "100%", backgroundColor: colors.primary }} />
        </View>
      </View>
      <Text style={[styles.statBarSide, { color: colors.destructive }]}>{awayVal}{suffix}</Text>
    </View>
  );
}

function EventRow({ event }: { event: MatchEvent }) {
  const colors = useColors();
  const colorMap: Record<string, string> = {
    goal: colors.primary,
    concede: colors.destructive,
    save: colors.accent,
    chance: colors.mutedForeground,
    yellow: "#FFD60A",
    red: colors.destructive,
    halftime: colors.mutedForeground,
    fulltime: colors.foreground,
    kickoff: colors.mutedForeground,
  };
  const iconMap: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
    goal: "target",
    concede: "alert-triangle",
    save: "shield",
    chance: "wind",
    yellow: "square",
    red: "x-square",
    halftime: "pause-circle",
    fulltime: "flag",
    kickoff: "play",
  };
  const big = event.kind === "goal" || event.kind === "concede" || event.kind === "fulltime";
  return (
    <View style={[styles.eventRow]}>
      <View
        style={[
          styles.eventDot,
          { backgroundColor: (colorMap[event.kind] ?? colors.mutedForeground) + "22" },
        ]}
      >
        <Feather
          name={iconMap[event.kind] ?? "circle"}
          size={12}
          color={colorMap[event.kind] ?? colors.mutedForeground}
        />
      </View>
      <Text
        style={[
          styles.eventText,
          {
            color: colorMap[event.kind] ?? colors.foreground,
            fontFamily: big ? "Inter_600SemiBold" : "Inter_500Medium",
          },
        ]}
      >
        {event.text}
      </Text>
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
  },
  iconBtn: { padding: 8 },
  headerLabel: { fontSize: 11, letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  scoreboard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 16,
  },
  team: { flex: 1, alignItems: "center" },
  crest: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  teamName: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  teamRating: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  scoreCol: { alignItems: "center", paddingHorizontal: 12 },
  scoreText: { fontSize: 44, fontFamily: "Inter_700Bold" },
  minuteChip: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  minuteText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 14 },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  timelineWrap: {
    flex: 1,
    margin: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    overflow: "hidden",
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  timelineTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  verdict: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 16, lineHeight: 20 },
  statBarRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  statBarSide: { width: 38, fontSize: 13, fontFamily: "Inter_700Bold" },
  statBarMid: { flex: 1 },
  statBarLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textAlign: "center", marginBottom: 4 },
  statBarBg: { height: 6, borderRadius: 4, overflow: "hidden" },
  insightCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  insightLabel: { fontSize: 9, letterSpacing: 1, fontFamily: "Inter_700Bold", marginBottom: 2 },
  insightText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  emptyTimeline: { padding: 24, alignItems: "center" },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    gap: 10,
  },
  eventDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  eventText: { flex: 1, fontSize: 13, lineHeight: 18 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
  bigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bigBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  playingBar: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  playingFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.25,
  },
  playingText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  resultBanner: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  resultBannerText: {
    color: "#0A0E1A",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
