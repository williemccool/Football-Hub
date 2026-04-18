import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import {
  analytics,
  auth,
  flags,
  haptics,
  isRemoteConfigured,
  sync,
  tester,
  type AccountInfo,
  type SyncSnapshot,
  type TesterProfile,
} from "@/services";

const SUPPORT_EMAIL = "support@slash-football.example";
const PRIVACY_URL = "https://example.com/slash-football/privacy";
const TERMS_URL = "https://example.com/slash-football/terms";

function fmt(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reset } = useGame();
  const [hapticsOn, setHapticsOn] = useState(haptics.isEnabled());
  const [audioOn, setAudioOn] = useState(true);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [snap, setSnap] = useState<SyncSnapshot>(sync.snapshot());
  const [profile, setProfile] = useState<TesterProfile | null>(tester.current());

  useEffect(() => {
    analytics.track("settings_viewed");
    auth.getAccount().then(setAccount);
    return haptics.subscribe(setHapticsOn);
  }, []);

  useEffect(() => sync.subscribe(setSnap), []);
  useEffect(() => tester.subscribe(setProfile), []);

  const top = Platform.OS === "web" ? 24 : insets.top + 12;
  const build = tester.getBuild();
  const opsVisible = flags.bool("ops_admin_visible");

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const confirmReset = () => {
    Alert.alert(
      "Reset progress?",
      "This deletes your local save and account ID. Cloud progress (if any) will be re-synced fresh.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await reset();
            router.back();
          },
        },
      ],
    );
  };

  const cycleCohort = async () => {
    const cohorts = ["internal-dev", "internal-qa", "alpha-wave-1", "alpha-wave-2", "beta"];
    const i = cohorts.indexOf(profile?.cohort ?? cohorts[0]!);
    const next = cohorts[(i + 1) % cohorts.length]!;
    await tester.update({ cohort: next, internal: next.startsWith("internal") });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {build.buildChannel !== "production" && (
          <View style={[styles.banner, { backgroundColor: "#FFB34722", borderColor: "#FFB347" }]}>
            <Text style={styles.bannerEmoji}>🧪</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: "#FFB347" }]}>
                {build.buildChannel.toUpperCase()} BUILD
              </Text>
              <Text style={[styles.bannerBody, { color: colors.mutedForeground }]}>
                {build.label}
              </Text>
            </View>
          </View>
        )}

        <Section title="Preferences">
          <ToggleRow
            icon="zap"
            label="Haptics"
            value={hapticsOn}
            onChange={(v) => haptics.setEnabled(v)}
          />
          <ToggleRow
            icon="volume-2"
            label="Sound effects"
            value={audioOn}
            onChange={setAudioOn}
            note="Coming soon"
          />
        </Section>

        <Section title="Feedback">
          <ActionRow
            icon="message-square"
            label="Send feedback"
            color={colors.primary}
            onPress={() => router.push("/feedback?kind=send_feedback")}
          />
          <ActionRow
            icon="alert-octagon"
            label="Report an issue"
            color={colors.destructive}
            onPress={() => router.push("/feedback?kind=report_issue&category=bug")}
          />
        </Section>

        <Section title="Tester profile">
          <Row label="Install ID" value={profile?.installId ?? "—"} />
          <Row label="Installed" value={fmt(profile?.installedAt ?? null)} />
          <Pressable onPress={cycleCohort} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Cohort</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.rowValue, { color: colors.primary }]} numberOfLines={1}>
                {profile?.cohort ?? "—"}
              </Text>
              <Feather name="repeat" size={12} color={colors.primary} />
            </View>
          </Pressable>
          <Row label="Type" value={profile?.internal ? "Internal" : "External"} />
          <Row label="Source" value={profile?.source ?? "—"} />
          <Row label="Region" value={profile?.region ?? "—"} />
          <Row label="Experiment" value={profile?.experimentGroup ?? "—"} />
        </Section>

        <Section title="Account">
          <Row label="User ID" value={account?.userId ?? snap.userId ?? "—"} />
          <Row
            label="Type"
            value={
              account?.kind === "guest"
                ? "Guest"
                : account?.kind === "email"
                  ? `Email · ${account.email ?? ""}`
                  : account?.kind === "social"
                    ? `Social · ${account.provider ?? ""}`
                    : "—"
            }
          />
          <Row label="Created" value={fmt(account?.createdAt ?? null)} />
          <Pressable
            onPress={() =>
              Alert.alert(
                "Account upgrade",
                "Email/social sign-in is coming soon. Your progress is already cloud-synced under your guest ID.",
              )
            }
            style={({ pressed }) => [
              styles.actionRow,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="user-plus" size={14} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>
              Upgrade account (coming soon)
            </Text>
          </Pressable>
        </Section>

        <Section title="Cloud Sync">
          <Row label="Backend" value={isRemoteConfigured() ? "Configured" : "Local-only"} />
          <Row label="Status" value={snap.status} />
          <Row label="Last sync" value={fmt(snap.lastSyncAt)} />
          <Row label="Pending" value={String(snap.pendingActions)} />
        </Section>

        <Section title="Support">
          <LinkRow icon="mail" label="Contact support" value={SUPPORT_EMAIL} onPress={() => open(`mailto:${SUPPORT_EMAIL}`)} />
          <LinkRow icon="shield" label="Privacy policy" value="View" onPress={() => open(PRIVACY_URL)} />
          <LinkRow icon="file-text" label="Terms of service" value="View" onPress={() => open(TERMS_URL)} />
        </Section>

        <Section title="App">
          <Row label="Version" value={build.appVersion} />
          <Row label="Build" value={build.buildNumber} />
          <Row label="Channel" value={build.buildChannel} />
          <Row label="Environment" value={build.environment} />
          <Row label="Platform" value={build.platform} />
          <Pressable
            onPress={() => router.push("/debug")}
            style={({ pressed }) => [
              styles.actionRow,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="activity" size={14} color={colors.foreground} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>
              Sync & debug info
            </Text>
          </Pressable>
          {opsVisible && (
            <>
              <Pressable
                onPress={() => router.push("/admin")}
                style={({ pressed }) => [
                  styles.actionRow,
                  { borderColor: "#FFB34766", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="sliders" size={14} color="#FFB347" />
                <Text style={[styles.actionText, { color: "#FFB347" }]}>
                  Tuning admin
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/economy")}
                style={({ pressed }) => [
                  styles.actionRow,
                  { borderColor: "#FFB34766", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="bar-chart-2" size={14} color="#FFB347" />
                <Text style={[styles.actionText, { color: "#FFB347" }]}>
                  Economy & live-ops
                </Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={confirmReset}
            style={({ pressed }) => [
              styles.actionRow,
              { borderColor: "#FF6B6B66", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="trash-2" size={14} color="#FF6B6B" />
            <Text style={[styles.actionText, { color: "#FF6B6B" }]}>
              Reset progress
            </Text>
          </Pressable>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

function ToggleRow({
  icon,
  label,
  value,
  onChange,
  note,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  note?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Feather name={icon} size={14} color={colors.mutedForeground} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {note && (
          <Text style={[styles.note, { color: colors.mutedForeground }]}>· {note}</Text>
        )}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function ActionRow({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Feather name={icon} size={14} color={color} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
    </Pressable>
  );
}

function LinkRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Feather name={icon} size={14} color={colors.mutedForeground} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={[styles.rowValue, { color: colors.primary }]} numberOfLines={1}>
          {value}
        </Text>
        <Feather name="external-link" size={12} color={colors.primary} />
      </View>
    </Pressable>
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
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerEmoji: { fontSize: 22 },
  bannerTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  bannerBody: { fontSize: 11, marginTop: 2, fontFamily: "Inter_500Medium" },
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
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  rowLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", maxWidth: "60%" },
  note: { fontSize: 10, fontFamily: "Inter_400Regular" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    margin: 8,
  },
  actionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
