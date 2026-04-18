import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { feedback, type FeedbackCategory, type FeedbackKind } from "@/services";

const CATEGORIES: { id: FeedbackCategory; label: string; emoji: string }[] = [
  { id: "controls", label: "Controls", emoji: "🎮" },
  { id: "slash_fun", label: "Slash fun", emoji: "⚡" },
  { id: "rewards", label: "Rewards", emoji: "💎" },
  { id: "progression", label: "Progression", emoji: "📈" },
  { id: "match_fairness", label: "Match fairness", emoji: "⚖️" },
  { id: "visuals", label: "Visuals", emoji: "🎨" },
  { id: "performance", label: "Performance", emoji: "⏱️" },
  { id: "bug", label: "Bug", emoji: "🐞" },
  { id: "confusion", label: "Confusion", emoji: "❓" },
  { id: "other", label: "Other", emoji: "✏️" },
];

export default function FeedbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string; category?: string }>();
  const initialKind: FeedbackKind = params.kind === "report_issue" ? "report_issue" : "send_feedback";
  const initialCategory: FeedbackCategory =
    (CATEGORIES.find((c) => c.id === params.category)?.id as FeedbackCategory | undefined) ??
    (initialKind === "report_issue" ? "bug" : "other");

  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    await feedback.submit({
      kind,
      category,
      rating: null,
      message,
      context: { source: "feedback_screen" },
    });
    setSubmitted(true);
    setTimeout(() => router.back(), 900);
  };

  const top = insets.top + 12;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {kind === "report_issue" ? "Report an issue" : "Send feedback"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>TYPE</Text>
        <View style={styles.kindRow}>
          {(["send_feedback", "report_issue"] as const).map((k) => {
            const active = k === kind;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={({ pressed }) => [
                  styles.kindBtn,
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
                  {k === "report_issue" ? "Report issue" : "Send feedback"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 18 }]}>CATEGORY</Text>
        <View style={styles.catWrap}>
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={({ pressed }) => [
                  styles.catChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.catEmoji}>{c.emoji}</Text>
                <Text
                  style={{
                    color: active ? colors.primaryForeground : colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 18 }]}>
          MESSAGE
        </Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={
            kind === "report_issue"
              ? "What happened, and what did you expect instead?"
              : "Tell us what worked, what didn't, or what you'd love to see."
          }
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={1000}
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        />
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>
          {message.length}/1000
        </Text>

        <Pressable
          onPress={submit}
          disabled={submitted || message.trim().length === 0}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: colors.primary,
              opacity: submitted || message.trim().length === 0 ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather
            name={submitted ? "check" : "send"}
            size={14}
            color={colors.primaryForeground}
          />
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
            {submitted ? "Sent — thanks" : "Submit"}
          </Text>
        </Pressable>

        <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
          Stored locally on your device with your tester id and build label. Used only
          to improve the game.
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
  label: { fontSize: 11, letterSpacing: 1, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  kindRow: { flexDirection: "row", gap: 8 },
  kindBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  catEmoji: { fontSize: 14 },
  input: {
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlignVertical: "top",
  },
  counter: { fontSize: 10, marginTop: 4, textAlign: "right", fontFamily: "Inter_500Medium" },
  submitBtn: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  privacy: { fontSize: 10, marginTop: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
});
