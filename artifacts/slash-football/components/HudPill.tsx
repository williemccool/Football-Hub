import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Icon3D, Icon3DName } from "@/components/Icon3D";
import { useColors } from "@/hooks/useColors";

/**
 * Map common Feather names that callers used to pass in to the equivalent 3D
 * football-themed glyph, so existing call-sites keep working without churn.
 */
const FEATHER_TO_ICON3D: Partial<Record<string, Icon3DName>> = {
  "dollar-sign": "moneybag",
  zap: "lightning",
  star: "star",
  shield: "shield",
  award: "trophy",
  users: "squad",
  calendar: "calendar",
  "bar-chart-2": "chart",
  eye: "eye",
  smile: "smile",
};

export function HudPill({
  icon,
  value,
  color,
}: {
  /**
   * Either a Feather name (legacy) or an Icon3D semantic name. Feather
   * fallbacks are kept so any caller still passing line-icon names renders.
   */
  icon: Icon3DName | React.ComponentProps<typeof Feather>["name"];
  value: string | number;
  color?: string;
}) {
  const colors = useColors();
  const mapped = FEATHER_TO_ICON3D[icon as string];
  const icon3DName: Icon3DName | undefined = mapped ?? (icon as Icon3DName);
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Icon3D name={icon3DName} size={14} />
      <Text style={[styles.pillText, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
});
