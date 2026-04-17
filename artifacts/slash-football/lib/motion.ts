import type { MotionKind, ObjectKind } from "./types";

export interface ObjectMotion {
  type: MotionKind;
  vy: number;       // base vertical speed (px/sec)
  vx: number;       // horizontal speed (px/sec)
  baseX: number;    // anchor for sine motion
  amp: number;      // sine amplitude
  freq: number;     // sine frequency
}

export function motionForKind(kind: ObjectKind, elapsedMs: number, screenWidth: number): {
  motion: MotionKind;
  vy: number;
  vx: number;
  amp: number;
  freq: number;
} {
  const t = elapsedMs / 1000;
  const intensity = t < 5 ? 0.85 : t < 12 ? 1.0 : t < 18 ? 1.18 : 1.32;

  // Rare/precision objects move differently
  if (kind === "golden") {
    return { motion: "fast", vy: 320 * intensity, vx: (Math.random() - 0.5) * 60, amp: 0, freq: 0 };
  }
  if (kind === "catalyst") {
    return { motion: "precise", vy: 260 * intensity, vx: (Math.random() - 0.5) * 40, amp: 0, freq: 0 };
  }
  if (kind === "trap" || kind === "injury") {
    // slightly faster hazards in late waves so dodging matters
    return { motion: "fast", vy: 230 * intensity, vx: (Math.random() - 0.5) * 30, amp: 0, freq: 0 };
  }

  // Random base motion mix
  const roll = Math.random();
  if (roll < 0.3) {
    return { motion: "drop", vy: 180 * intensity, vx: 0, amp: 0, freq: 0 };
  } else if (roll < 0.5) {
    return { motion: "heavy", vy: 130 * intensity, vx: 0, amp: 0, freq: 0 };
  } else if (roll < 0.7) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    return { motion: "angled", vy: 180 * intensity, vx: dir * 80, amp: 0, freq: 0 };
  } else if (roll < 0.88) {
    return {
      motion: "curved",
      vy: 170 * intensity,
      vx: 0,
      amp: 70 + Math.random() * 50,
      freq: 1.5 + Math.random() * 1.5,
    };
  }
  // fast drop
  return { motion: "fast", vy: 280 * intensity, vx: 0, amp: 0, freq: 0 };
}
