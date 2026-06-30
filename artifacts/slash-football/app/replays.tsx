import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { analytics, objectStorage } from "@/services";
import type { MatchAnalysis, MatchEvent } from "@/lib/types";

interface ReplayPayload {
  id: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  analysis?: MatchAnalysis;
  playedAt: number;
}

interface ReplayIndexEntry {
  key: string;
  size: number;
  payload: ReplayPayload | null;
}

function fmtDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function outcomeFor(p: ReplayPayload): "win" | "draw" | "loss" {
  if (p.homeScore > p.awayScore) return "win";
  if (p.homeScore === p.awayScore) return "draw";
  return "loss";
}

export default function ReplaysScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ReplayIndexEntry[] | null>(null);
  const [selected, setSelected] = useState<ReplayPayload | null>(null);

  const refresh = useCallback(async () => {
    const list = await objectStorage.listReplays("replay_");
    const hydrated = await Promise.all(
      list.map(async (entry) => {
        const payload = (await objectStorage.getReplay(entry.key)) as
          | ReplayPayload
          | null;
        return { ...entry, payload };
      }),
    );
    hydrated.sort((a, b) => (b.payload?.playedAt ?? 0) - (a.payload?.playedAt ?? 0));
    setItems(hydrated);
  }, []);

  useEffect(() => {
    analytics.track("replays_viewed");
    refresh();
  }, [refresh]);

  const top = Platform.OS === "web" ? 24 : insets.top + 12;

  const totalSize = useMemo(
    () => (items ?? []).reduce((s, i) => s + i.size, 0),
    [items],
  );

  const open = (entry: ReplayIndexEntry) => {
    if (!entry.payload) return;
    analytics.track("replay_opened", {
      key: entry.key,
      outcome: outcomeFor(entry.payload),
    });
    setSelected(entry.payload);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Replays</Text>
        <Pressable onPress={refresh} hitSlop={10}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {items === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="film" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No replays yet
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            Finish a match and the highlight reel will land here automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {items.length} cached replay{items.length === 1 ? "" : "s"} •{" "}
              {(totalSize / 1024).toFixed(1)} KB
            </Text>
          }
          renderItem={({ item }) => (
            <ReplayRow item={item} onOpen={() => open(item)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <ReplayDetail
          payload={selected}
          onClose={() => setSelected(null)}
          insetTop={top}
        />
      </Modal>
    </View>
  );
}

function ReplayRow({
  item,
  onOpen,
}: {
  item: ReplayIndexEntry;
  onOpen: () => void;
}) {
  const colors = useColors();
  const p = item.payload;
  if (!p) {
    return (
      <View
        style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Feather name="alert-circle" size={16} color={colors.mutedForeground} />
        <Text style={[styles.rowMissing, { color: colors.mutedForeground }]}>
          {item.key} · payload unavailable
        </Text>
      </View>
    );
  }
  const outcome = outcomeFor(p);
  const tint =
    outcome === "win"
      ? colors.primary
      : outcome === "draw"
        ? colors.accent
        : colors.destructive;
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.scorePill, { borderColor: tint }]}>
        <Text style={[styles.scoreText, { color: tint }]}>
          {p.homeScore}-{p.awayScore}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
          vs {p.opponent}
        </Text>
        <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {fmtDate(p.playedAt)} · {p.events.length} event
          {p.events.length === 1 ? "" : "s"} · {(item.size / 1024).toFixed(1)} KB
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function ReplayDetail({
  payload,
  onClose,
  insetTop,
}: {
  payload: ReplayPayload | null;
  onClose: () => void;
  insetTop: number;
}) {
  const colors = useColors();
  if (!payload) return null;
  const outcome = outcomeFor(payload);
  const tint =
    outcome === "win"
      ? colors.primary
      : outcome === "draw"
        ? colors.accent
        : colors.destructive;

  return (
    <View style={[styles.detail, { backgroundColor: colors.background, paddingTop: insetTop }]}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.detailTitle, { color: colors.foreground }]} numberOfLines={1}>
          vs {payload.opponent}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={[styles.scoreBlock, { borderColor: tint }]}>
          <Text style={[styles.scoreBig, { color: tint }]}>
            {payload.homeScore} — {payload.awayScore}
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
            {outcome.toUpperCase()} · {fmtDate(payload.playedAt)}
          </Text>
        </View>

        {payload.analysis && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.section, { color: colors.mutedForeground }]}>
              ANALYSIS
            </Text>
            <Text style={[styles.body, { color: colors.foreground }]}>
              {payload.analysis.verdict}
            </Text>
            <Text style={[styles.bodyMuted, { color: colors.mutedForeground }]}>
              {payload.analysis.tacticalNote}
            </Text>
            <Text style={[styles.bodyMuted, { color: colors.mutedForeground }]}>
              {payload.analysis.suggestion}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.section, { color: colors.mutedForeground }]}>
            TIMELINE
          </Text>
          {payload.events.length === 0 ? (
            <Text style={[styles.bodyMuted, { color: colors.mutedForeground }]}>
              No events recorded.
            </Text>
          ) : (
            payload.events.map((e, idx) => (
              <View key={idx} style={styles.eventRow}>
                <Text style={[styles.eventMin, { color: colors.primary }]}>
                  {e.minute}'
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventText, { color: colors.foreground }]}>
                    {e.text}
                  </Text>
                  <Text style={[styles.eventKind, { color: colors.mutedForeground }]}>
                    {e.team} · {e.kind}
                    {e.player ? ` · ${e.player}` : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 11, marginBottom: 12, fontFamily: "Inter_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyBody: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    maxWidth: 280,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 11, marginTop: 2, fontFamily: "Inter_500Medium" },
  rowMissing: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scorePill: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  scoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  detail: { flex: 1 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  detailTitle: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  scoreBlock: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 16,
  },
  scoreBig: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  scoreLabel: { fontSize: 11, marginTop: 4, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  section: { fontSize: 11, letterSpacing: 1, marginBottom: 8, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  bodyMuted: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 18 },
  eventRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  eventMin: {
    width: 36,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  eventText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  eventKind: { fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
});
