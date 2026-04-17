import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { cache } from "./cache";

const PREF_KEY = "slashfootball.hapticsEnabled.v1";

let enabled = true;
let lastFireAt = 0;
const listeners = new Set<(v: boolean) => void>();

function notify() {
  for (const l of listeners) l(enabled);
}

// Non-blocking preload of preference.
cache.read<boolean>(PREF_KEY).then((v) => {
  if (v !== null) {
    enabled = v;
    notify();
  }
});

export type HapticEvent =
  | "slice"        // light: normal slice
  | "comboUp"     // medium: combo tier increase
  | "golden"      // heavy + selection: rare/jackpot
  | "hazard"      // warning: hit a bad object
  | "error"       // error feedback
  | "success"     // success at end-of-run reveal
  | "tap";        // ui tap

const MIN_GAP_MS: Record<HapticEvent, number> = {
  slice: 30,
  comboUp: 80,
  golden: 0,
  hazard: 60,
  error: 0,
  success: 0,
  tap: 30,
};

function canFire(evt: HapticEvent) {
  if (!enabled) return false;
  if (Platform.OS === "web") return false;
  const now = Date.now();
  if (now - lastFireAt < MIN_GAP_MS[evt]) return false;
  lastFireAt = now;
  return true;
}

export const haptics = {
  isEnabled(): boolean {
    return enabled;
  },
  async setEnabled(v: boolean): Promise<void> {
    enabled = v;
    await cache.write(PREF_KEY, v);
    notify();
  },
  subscribe(fn: (v: boolean) => void): () => void {
    listeners.add(fn);
    fn(enabled);
    return () => listeners.delete(fn);
  },
  fire(evt: HapticEvent): void {
    if (!canFire(evt)) return;
    try {
      switch (evt) {
        case "slice":
        case "tap":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        case "comboUp":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          return;
        case "golden":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(
            () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
            60,
          );
          return;
        case "hazard":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        case "error":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        case "success":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
      }
    } catch {
      /* swallow — haptics should never crash gameplay */
    }
  },
};
