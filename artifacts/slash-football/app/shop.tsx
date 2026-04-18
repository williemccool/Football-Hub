import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { analytics } from "@/services";

type Tab = "kits" | "crests" | "pitch" | "celebrations";

interface Item {
  id: string;
  name: string;
  desc: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
}

const CATALOG: Record<Tab, Item[]> = {
  kits: [
    { id: "k1", name: "Aurora Home", desc: "Neon-stitched home kit", rarity: "Rare" },
    { id: "k2", name: "Midnight Away", desc: "Stealth carbon weave", rarity: "Epic" },
    { id: "k3", name: "Solar Flare 3rd", desc: "Limited season drop", rarity: "Legendary" },
    { id: "k4", name: "Classic Stripes", desc: "Heritage cotton revival", rarity: "Common" },
  ],
  crests: [
    { id: "c1", name: "Bolt Sigil", desc: "Animated lightning crest", rarity: "Rare" },
    { id: "c2", name: "Phoenix Mark", desc: "Foil-pressed crest", rarity: "Epic" },
    { id: "c3", name: "Stadium Rose", desc: "Hand-drawn heritage", rarity: "Common" },
  ],
  pitch: [
    { id: "p1", name: "Stadium Lights", desc: "Floodlit broadcast theme", rarity: "Rare" },
    { id: "p2", name: "Holographic Pitch", desc: "Animated grid overlay", rarity: "Legendary" },
    { id: "p3", name: "Sunset Match", desc: "Warm tone broadcast", rarity: "Epic" },
  ],
  celebrations: [
    { id: "g1", name: "Lightning Strike", desc: "Bolt FX on goal", rarity: "Rare" },
    { id: "g2", name: "Confetti Burst", desc: "Stadium-wide cascade", rarity: "Epic" },
    { id: "g3", name: "Fireworks Show", desc: "End-of-match payoff", rarity: "Legendary" },
  ],
};

const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { id: "kits", label: "Kits", icon: "user" },
  { id: "crests", label: "Crests", icon: "shield" },
  { id: "pitch", label: "Pitch", icon: "grid" },
  { id: "celebrations", label: "FX", icon: "star" },
];

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("kits");
  const top = Platform.OS === "web" ? 24 : insets.top + 12;

  useEffect(() => {
    analytics.track("shop_viewed");
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Cosmetics Shop</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? colors.primary + "22" : "transparent",
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather
                name={t.icon}
                size={14}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <LinearGradient
          colors={[colors.primary + "33", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.banner, { borderColor: colors.border }]}
        >
          <Feather name="gift" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.foreground }]}>
              Cosmetics drop coming soon
            </Text>
            <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
              Browse the lineup. No monetization yet — preview only.
            </Text>
          </View>
        </LinearGradient>

        {CATALOG[tab].map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

function rarityColor(r: Item["rarity"]) {
  if (r === "Legendary") return "#FFE066";
  if (r === "Epic") return "#B36BFF";
  if (r === "Rare") return "#41D7FF";
  return "#8E8E93";
}

function ItemCard({ item }: { item: Item }) {
  const colors = useColors();
  const rc = rarityColor(item.rarity);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <LinearGradient
        colors={[rc + "33", rc + "08"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.thumb}
      >
        <Feather name="package" size={26} color={rc} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardName, { color: colors.foreground }]}>{item.name}</Text>
          <View style={[styles.rarityChip, { borderColor: rc }]}>
            <Text style={[styles.rarityText, { color: rc }]}>{item.rarity}</Text>
          </View>
        </View>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
        <View style={styles.cardBtnRow}>
          <View style={[styles.soonBtn, { borderColor: colors.border }]}>
            <Feather name="clock" size={11} color={colors.mutedForeground} />
            <Text style={[styles.soonText, { color: colors.mutedForeground }]}>Coming Soon</Text>
          </View>
        </View>
      </View>
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
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  bannerSub: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardName: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  rarityChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  rarityText: { fontSize: 9, letterSpacing: 0.6, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  cardBtnRow: { flexDirection: "row", marginTop: 6 },
  soonBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  soonText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
