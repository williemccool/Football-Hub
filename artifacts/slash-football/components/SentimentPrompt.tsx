import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SENTIMENT_LAST_KEY } from "@/constants/storageKeys";
import { useColors } from "@/hooks/useColors";
import {
  analytics,
  cache,
  feedback,
  flags,
  type FeedbackCategory,
} from "@/services";

type Surface = "match_completed" | "slash_run_completed";

const QUESTIONS: Record<Surface, { question: string; category: FeedbackCategory; minGapMs: number }> = {
  match_completed: {
    question: "Did this match feel fair?",
    category: "match_fairness",
    minGapMs: 1000 * 60 * 30,
  },
  slash_run_completed: {
    question: "Was that slash run fun?",
    category: "slash_fun",
    minGapMs: 1000 * 60 * 20,
  },
};

interface Props {
  surface: Surface;
  /** Mounted by parent only when the surface event fires. */
  visible: boolean;
  onClose: () => void;
  context?: Record<string, unknown>;
}

/**
 * Lightweight one-tap sentiment prompt. Shown rarely (rate-limited per
 * surface) and never blocks gameplay. Hidden when the
 * `session_sentiment_prompt` flag is off.
 */
export function SentimentPrompt({ surface, visible, onClose, context }: Props) {
  const colors = useColors();
  const [eligible, setEligible] = useState(false);
  const [step, setStep] = useState<"rate" | "comment" | "done">("rate");
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (!flags.bool("session_sentiment_prompt")) {
      onClose();
      return;
    }
    (async () => {
      const last = (await cache.read<Record<string, number>>(SENTIMENT_LAST_KEY)) ?? {};
      const lastTs = last[surface] ?? 0;
      const okay = Date.now() - lastTs > QUESTIONS[surface].minGapMs;
      setEligible(okay);
      if (okay) {
        analytics.track("sentiment_prompt_shown", { surface });
      } else {
        onClose();
      }
    })();
  }, [visible, surface, onClose]);

  const finish = async (skipped: boolean) => {
    const last = (await cache.read<Record<string, number>>(SENTIMENT_LAST_KEY)) ?? {};
    last[surface] = Date.now();
    await cache.write(SENTIMENT_LAST_KEY, last);
    if (skipped) {
      analytics.track("sentiment_prompt_dismissed", { surface });
    }
    setStep("rate");
    setRating(null);
    setText("");
    onClose();
  };

  const submitRating = async (r: number) => {
    setRating(r);
    await feedback.submit({
      kind: "sentiment_prompt",
      category: QUESTIONS[surface].category,
      rating: r,
      message: "",
      context: { surface, ...context },
    });
    if (r <= 3) {
      setStep("comment");
    } else {
      setStep("done");
      setTimeout(() => finish(false), 600);
    }
  };

  const submitComment = async () => {
    await feedback.submit({
      kind: "send_feedback",
      category: QUESTIONS[surface].category,
      rating,
      message: text,
      context: { surface, followsUpRating: rating, ...context },
    });
    setStep("done");
    setTimeout(() => finish(false), 600);
  };

  if (!eligible || !visible) return null;

  const q = QUESTIONS[surface].question;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => finish(true)}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            onPress={() => finish(true)}
            hitSlop={10}
            style={styles.closeBtn}
          >
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
          {step === "rate" && (
            <>
              <Text style={[styles.q, { color: colors.foreground }]}>{q}</Text>
              <View style={styles.scaleRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => submitRating(n)}
                    style={({ pressed }) => [
                      styles.scaleBtn,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.scaleEmoji]}>
                      {n === 1 ? "😞" : n === 2 ? "🙁" : n === 3 ? "😐" : n === 4 ? "🙂" : "😄"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Tap a face. We use this only to tune the game.
              </Text>
            </>
          )}
          {step === "comment" && (
            <>
              <Text style={[styles.q, { color: colors.foreground }]}>What was off?</Text>
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                placeholder="Optional — any detail helps."
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                maxLength={500}
              />
              <View style={styles.commentRow}>
                <Pressable
                  onPress={() => finish(false)}
                  style={({ pressed }) => [
                    styles.skipBtn,
                    { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
                    Skip
                  </Text>
                </Pressable>
                <Pressable
                  onPress={submitComment}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold" }}>
                    Send
                  </Text>
                </Pressable>
              </View>
            </>
          )}
          {step === "done" && (
            <View style={styles.doneRow}>
              <Feather name="check-circle" size={18} color={colors.primary} />
              <Text style={[styles.doneText, { color: colors.foreground }]}>
                Thanks — noted.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    paddingTop: 26,
  },
  closeBtn: { position: "absolute", top: 8, right: 8, padding: 8 },
  q: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  scaleRow: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  scaleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  scaleEmoji: { fontSize: 22 },
  hint: { marginTop: 12, fontSize: 11, fontFamily: "Inter_500Medium" },
  input: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlignVertical: "top",
  },
  commentRow: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  sendBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  doneText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
