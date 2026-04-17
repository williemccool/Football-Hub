import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

export default function TacticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, setTactics } = useGame();

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tactics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30 }}>
        <Group
          label="Formation"
          options={["4-3-3", "4-4-2", "3-5-2"] as const}
          value={state.formation}
          onChange={(v) => setTactics({ formation: v })}
        />
        <Group
          label="Style"
          options={["Defensive", "Balanced", "Attacking"] as const}
          value={state.style}
          onChange={(v) => setTactics({ style: v })}
        />
        <Group
          label="Pressing"
          options={["Low", "Medium", "High"] as const}
          value={state.pressing}
          onChange={(v) => setTactics({ pressing: v })}
        />
        <Group
          label="Tempo"
          options={["Slow", "Normal", "Fast"] as const}
          value={state.tempo}
          onChange={(v) => setTactics({ tempo: v })}
        />

        <View
          style={[
            styles.note,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="info" size={14} color={colors.accent} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Style affects attack/defense balance. Pressing and tempo will influence
            event frequency in upcoming match revisions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Group<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={({ pressed }) => [
                styles.opt,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? colors.primaryForeground : colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 13,
                }}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    paddingBottom: 8,
  },
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  label: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
  },
  row: { flexDirection: "row", gap: 8 },
  opt: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  note: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
});
