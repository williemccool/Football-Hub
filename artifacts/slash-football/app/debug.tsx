import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sync, objectStorage, isRemoteConfigured } from "@/services";
import { useColors } from "@/hooks/useColors";

interface DebugInfo {
  status: string;
  userId: string | null;
  stateVersion: number;
  lastSyncAt: number | null;
  lastError: string | null;
  pendingActions: number;
  migrationCompleted: boolean;
  localStateExists: boolean;
  legacyStateExists: boolean;
  remoteConfigured: boolean;
  replayCount: number;
}

function fmt(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export default function DebugScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<DebugInfo | null>(null);

  const refresh = async () => {
    const base = await sync.getDebugInfo();
    const replays = await objectStorage.listReplays();
    setInfo({ ...base, replayCount: replays.length });
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, []);

  const top = Platform.OS === "web" ? 24 : insets.top + 12;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Sync & Debug</Text>
        <Pressable onPress={() => sync.flush()} hitSlop={10}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Section title="Backend">
          <Row label="Configured" value={isRemoteConfigured() ? "yes" : "no (local-only)"} />
          <Row label="Status" value={info?.status ?? "…"} />
          <Row label="Last sync" value={fmt(info?.lastSyncAt ?? null)} />
          <Row label="State version" value={String(info?.stateVersion ?? 0)} />
          <Row label="Pending pushes" value={String(info?.pendingActions ?? 0)} />
          <Row label="Last error" value={info?.lastError ?? "none"} />
        </Section>

        <Section title="Identity">
          <Row label="User ID" value={info?.userId ?? "—"} />
        </Section>

        <Section title="Local data">
          <Row label="Local canonical save" value={info?.localStateExists ? "present" : "missing"} />
          <Row label="Legacy v2 save" value={info?.legacyStateExists ? "present" : "absent"} />
          <Row label="Migration complete" value={info?.migrationCompleted ? "yes" : "no"} />
          <Row label="Cached replays" value={String(info?.replayCount ?? 0)} />
        </Section>

        <Pressable
          onPress={refresh}
          style={({ pressed }) => [
            styles.btn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="refresh-cw" size={14} color={colors.foreground} />
          <Text style={[styles.btnText, { color: colors.foreground }]}>Refresh</Text>
        </Pressable>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Backend URL is read from EXPO_PUBLIC_API_URL. When unset, the app runs
          in local-only mode and queues a push for whenever a backend is configured.
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.section, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
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
  section: {
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  card: { padding: 4, borderRadius: 14, borderWidth: 1 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  rowLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", maxWidth: "60%" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  btnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  hint: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 16,
    fontFamily: "Inter_400Regular",
    opacity: 0.7,
  },
});
