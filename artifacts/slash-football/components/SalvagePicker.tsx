import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { cache } from "@/services/cache";
import { haptics } from "@/services";
import { useColors } from "@/hooks/useColors";
import type { SalvageMode } from "@/context/GameContext";
import type { Player } from "@/lib/types";

const REMEMBER_KEY = "slashfootball.salvagePref.v1";

interface RememberedPref {
  mode: SalvageMode;
  remember: boolean;
}

/**
 * Read the user's remembered salvage choice, if any. Call sites should
 * invoke this BEFORE opening the picker; if a valid pref exists, apply it
 * directly and skip the modal entirely.
 */
export async function getRememberedSalvage(): Promise<SalvageMode | null> {
  const p = await cache.read<RememberedPref>(REMEMBER_KEY);
  return p?.remember && p.mode ? p.mode : null;
}

export async function clearRememberedSalvage(): Promise<void> {
  await cache.remove(REMEMBER_KEY);
}

export interface SalvagePickerOptions {
  player: Player;
  hasEvolutionTarget: boolean;
}

interface Props {
  visible: boolean;
  options: SalvagePickerOptions | null;
  onCancel: () => void;
  onConfirm: (mode: SalvageMode) => void;
}

export function SalvagePicker({ visible, options, onCancel, onConfirm }: Props) {
  const colors = useColors();
  const [remember, setRemember] = useState(false);
  const [savedPref, setSavedPref] = useState<SalvageMode | null>(null);

  useEffect(() => {
    if (!visible) return;
    cache.read<RememberedPref>(REMEMBER_KEY).then((p) => {
      if (p?.remember && p.mode) {
        setSavedPref(p.mode);
        setRemember(true);
      } else {
        setSavedPref(null);
        setRemember(false);
      }
    });
  }, [visible]);

  if (!options) return null;

  const choose = async (mode: SalvageMode) => {
    haptics.fire("tap");
    if (remember) {
      await cache.write<RememberedPref>(REMEMBER_KEY, { mode, remember: true });
    } else {
      await cache.remove(REMEMBER_KEY);
    }
    onConfirm(mode);
  };

  const clearSaved = async () => {
    haptics.fire("tap");
    await cache.remove(REMEMBER_KEY);
    setSavedPref(null);
    setRemember(false);
  };

  const choices: {
    mode: SalvageMode;
    label: string;
    sub: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    color: string;
    disabled?: boolean;
    disabledReason?: string;
  }[] = [
    {
      mode: "coins",
      label: "Quick Sell",
      sub: "+40% coin value, small essence",
      icon: "dollar-sign",
      color: colors.accent,
    },
    {
      mode: "essence",
      label: "Convert to Essence",
      sub: "+120% essence, lower coins",
      icon: "droplet",
      color: "#41D7FF",
    },
    {
      mode: "evolution",
      label: "Apply to Evolution",
      sub: options.hasEvolutionTarget
        ? "Donate as shards to a same-role player"
        : "No eligible same-role target",
      icon: "trending-up",
      color: colors.primary,
      disabled: !options.hasEvolutionTarget,
      disabledReason: "No eligible same-role target",
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Salvage {options.player.name}?
            </Text>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {options.player.role} • Rating {options.player.rating}
          </Text>

          <View style={{ gap: 8, marginTop: 14 }}>
            {choices.map((c) => (
              <Pressable
                key={c.mode}
                disabled={c.disabled}
                onPress={() => choose(c.mode)}
                style={({ pressed }) => [
                  styles.choice,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: c.disabled ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.choiceIcon, { backgroundColor: c.color + "22" }]}>
                  <Feather name={c.icon} size={18} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.choiceLabel, { color: colors.foreground }]}>
                    {c.label}
                  </Text>
                  <Text style={[styles.choiceSub, { color: colors.mutedForeground }]}>
                    {c.sub}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>

          <View style={styles.rememberRow}>
            <Switch
              value={remember}
              onValueChange={setRemember}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
            <Text style={[styles.rememberText, { color: colors.mutedForeground }]}>
              Remember my choice
            </Text>
          </View>
          {savedPref && (
            <Pressable onPress={clearSaved} hitSlop={8} style={styles.clearRow}>
              <Feather name="rotate-ccw" size={12} color={colors.mutedForeground} />
              <Text style={[styles.rememberText, { color: colors.mutedForeground }]}>
                Currently remembered: {savedPref} — tap to clear
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    padding: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, marginTop: 2, fontFamily: "Inter_500Medium" },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  choiceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  choiceSub: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  rememberText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  clearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
});
