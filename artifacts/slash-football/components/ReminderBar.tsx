import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  analytics,
  notifications,
  type NotificationPayload,
  type ReminderSnapshot,
} from "@/services";

interface Props {
  snapshot: ReminderSnapshot;
}

const SEVERITY_ICON: Record<NotificationPayload["severity"], keyof typeof Feather.glyphMap> = {
  info: "info",
  success: "check-circle",
  warning: "alert-circle",
};

const SEVERITY_COLOR: Record<NotificationPayload["severity"], string> = {
  info: "#5BA9FF",
  success: "#00FF88",
  warning: "#FFB347",
};

/**
 * Stack of dismissable reminder cards driven by the portable notifications
 * service. Renders nothing when there's nothing to show.
 */
export function ReminderBar({ snapshot }: Props) {
  const colors = useColors();
  const [, setTick] = useState(0);

  const reminders = useMemo(() => notifications.computeReminders(snapshot), [snapshot]);

  useEffect(() => {
    for (const r of reminders) {
      analytics.track("reminder_shown", { trigger: r.trigger, id: r.id });
    }
    // We intentionally only re-fire the analytics when the *set of ids* changes,
    // so depend on a serialized id list rather than the array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders.map((r) => r.id).join(",")]);

  if (reminders.length === 0) return null;

  const dismiss = async (id: string) => {
    await notifications.dismiss(id);
    setTick((t) => t + 1);
  };

  return (
    <View style={{ marginTop: 14, gap: 8 }}>
      {reminders.slice(0, 3).map((r) => (
        <Pressable
          key={r.id}
          onPress={() => {
            if (r.route) router.push(r.route as never);
          }}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: colors.card,
              borderColor: SEVERITY_COLOR[r.severity] + "55",
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name={SEVERITY_ICON[r.severity]} size={16} color={SEVERITY_COLOR[r.severity]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{r.title}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>
              {r.body}
            </Text>
          </View>
          <Pressable
            hitSlop={8}
            onPress={(e) => {
              // Prevent the parent card's onPress from firing and routing
              // away while the user is just dismissing the reminder.
              e.stopPropagation();
              dismiss(r.id);
            }}
            style={styles.closeBtn}
          >
            <Feather name="x" size={14} color={colors.mutedForeground} />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: { fontSize: 13, fontFamily: "Inter_700Bold" },
  body: { fontSize: 11, marginTop: 2, fontFamily: "Inter_500Medium" },
  closeBtn: { padding: 4 },
});
