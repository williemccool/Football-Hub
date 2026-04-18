import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { analytics, notificationPrefs, type NotificationCategory, type NotificationPrefs } from "@/services";

interface CategoryDef {
  id: NotificationCategory;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  body: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "gameplay",
    icon: "play-circle",
    label: "Gameplay reminders",
    body: "Tickets full, matchday ready, daily objectives, upgrades available.",
  },
  {
    id: "season",
    icon: "award",
    label: "Season reminders",
    body: "Season ending soon, table-position changes.",
  },
  {
    id: "shop_pass",
    icon: "shopping-bag",
    label: "Shop & pass reminders",
    body: "Pass rewards waiting, limited cosmetic drops.",
  },
  {
    id: "marketing",
    icon: "send",
    label: "Promotional updates",
    body: "Optional news about events and seasonal launches. Off by default.",
  },
];

export default function NotificationsSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<NotificationPrefs>(notificationPrefs.get());

  useEffect(() => {
    analytics.track("notification_settings_viewed");
    return notificationPrefs.subscribe(setPrefs);
  }, []);

  const top = Platform.OS === "web" ? 24 : insets.top + 12;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Choose which reminders you want to see in-app and (when push is
          enabled later) on your lock screen. Promotional updates are off by
          default; turn them on only if you want event launch news.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {CATEGORIES.map((c, i) => (
            <View
              key={c.id}
              style={[
                styles.row,
                i < CATEGORIES.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={{ flexDirection: "row", flex: 1, gap: 12, alignItems: "flex-start" }}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: colors.muted, borderColor: colors.border },
                  ]}
                >
                  <Feather name={c.icon} size={14} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>{c.label}</Text>
                  <Text style={[styles.rowBody, { color: colors.mutedForeground }]}>
                    {c.body}
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs[c.id]}
                onValueChange={(v) => notificationPrefs.set(c.id, v)}
              />
            </View>
          ))}
        </View>

        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
          Push delivery is currently in-app only. When push is enabled in a
          later release these settings will apply to lock-screen reminders
          too.
        </Text>
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
  intro: { fontSize: 13, lineHeight: 18, marginBottom: 16, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rowBody: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular", lineHeight: 15 },
  footnote: { fontSize: 11, marginTop: 14, lineHeight: 15, fontFamily: "Inter_400Regular" },
});
