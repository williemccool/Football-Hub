import React from "react";
import { Platform, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

/**
 * Icon3D — football-themed icon system rendered with the platform's native
 * color-emoji font. Apple Color Emoji (iOS), Noto Color Emoji (Android) and
 * Segoe UI / Apple emoji on the web all render these glyphs as full-color,
 * faux-3D pictograms with no extra font assets to ship.
 *
 * Usage:
 *   <Icon3D name="football" size={28} />
 *   <Icon3D name="trophy" size={20} bubble bubbleColor="#FFD60A" />
 */

export type Icon3DName =
  | "football"        // ⚽ generic football / shard
  | "goal"            // 🥅 goal net
  | "trophy"          // 🏆 league / season
  | "medal"           // 🥇 award
  | "shield"          // 🛡️ defender / role shard
  | "boot"            // 👟 striker / squad
  | "gloves"          // 🧤 keeper
  | "stadium"         // 🏟️ club / hub
  | "fire"            // 🔥 streak / hot
  | "star"            // ⭐ rating / golden
  | "sparkle"         // ✨ premium
  | "lightning"       // ⚡ pace / shard / energy
  | "coin"            // 🪙 coins
  | "moneybag"        // 💰 wealth
  | "gem"             // 💎 essence / catalyst
  | "potion"          // 🧪 catalyst
  | "target"          // 🎯 intel / objective
  | "eye"             // 👁️ scout intel
  | "bandage"         // 🩹 physio
  | "battery"         // 🪫 burnout
  | "smile"           // 😊 morale
  | "redCard"         // 🟥 hazard trap
  | "injury"          // 🤕 injury
  | "spy"             // 🕵️ fake agent
  | "play"            // ▶️ start
  | "pause"           // ⏸
  | "ticket"          // 🎟️
  | "calendar"        // 📅 fixtures
  | "chart"           // 📊 league table
  | "squad"           // 👥 squad
  | "settings"        // ⚙️ settings
  | "close"           // ✖
  | "back"            // ◀
  | "next"            // ▶
  | "check"           // ✅
  | "warn"            // ⚠️
  | "lock"            // 🔒
  | "unlock"          // 🔓
  | "whistle"         // 📣 ref / kickoff
  | "stopwatch"       // ⏱
  | "globe"           // 🌍 league
  | "rocket"          // 🚀 boost
  | "crown"           // 👑 captain
  | "handshake"       // 🤝 transfer
  | "scroll"          // 📜 contract / objective
  | "bell";           // 🔔 alert / notification

const EMOJI: Record<Icon3DName, string> = {
  football: "⚽",
  goal: "🥅",
  trophy: "🏆",
  medal: "🥇",
  shield: "🛡️",
  boot: "👟",
  gloves: "🧤",
  stadium: "🏟️",
  fire: "🔥",
  star: "⭐",
  sparkle: "✨",
  lightning: "⚡",
  coin: "🪙",
  moneybag: "💰",
  gem: "💎",
  potion: "🧪",
  target: "🎯",
  eye: "👁️",
  bandage: "🩹",
  battery: "🪫",
  smile: "😊",
  redCard: "🟥",
  injury: "🤕",
  spy: "🕵️",
  play: "▶️",
  pause: "⏸️",
  ticket: "🎟️",
  calendar: "📅",
  chart: "📊",
  squad: "👥",
  settings: "⚙️",
  close: "✖️",
  back: "◀️",
  next: "▶️",
  check: "✅",
  warn: "⚠️",
  lock: "🔒",
  unlock: "🔓",
  whistle: "📣",
  stopwatch: "⏱️",
  globe: "🌍",
  rocket: "🚀",
  crown: "👑",
  handshake: "🤝",
  scroll: "📜",
  bell: "🔔",
};

interface Icon3DProps {
  name: Icon3DName;
  size?: number;
  style?: TextStyle;
  /** Wrap the icon in a soft circular bubble, like a chip avatar. */
  bubble?: boolean;
  bubbleColor?: string;
  bubbleSize?: number;
}

export function Icon3D({
  name,
  size = 20,
  style,
  bubble,
  bubbleColor,
  bubbleSize,
}: Icon3DProps) {
  const glyph = EMOJI[name] ?? "❓";
  const text = (
    <Text
      // Force the platform color emoji font so monochrome ⚽-style fallbacks
      // never appear on web.
      style={[
        styles.glyph,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.15),
          // On Android/web, give emoji a bit of breathing room so they don't clip.
          ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
        },
        style,
      ]}
      allowFontScaling={false}
    >
      {glyph}
    </Text>
  );

  if (!bubble) return text;

  const dim = bubbleSize ?? Math.round(size * 1.7);
  return (
    <View
      style={[
        styles.bubble,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: bubbleColor ?? "rgba(255,255,255,0.08)",
        } as ViewStyle,
      ]}
    >
      {text}
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: {
    textAlign: "center",
    // Apple Color Emoji on iOS/Mac, Segoe UI Emoji on Windows, Noto Color Emoji on Android/Linux.
    // Listing them all keeps web previews colorful too.
    fontFamily: Platform.select({
      ios: undefined,
      android: undefined,
      default:
        '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji","Twemoji Mozilla",sans-serif',
    }),
  },
  bubble: {
    alignItems: "center",
    justifyContent: "center",
  },
});
