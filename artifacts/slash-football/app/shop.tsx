import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import {
  CATEGORY_LABEL,
  COSMETIC_BUNDLES,
  type CosmeticCategory,
  type CosmeticItem,
  RARITY_COLOR,
  categoryTotal,
  getCosmetic,
  listByCategory,
  listComingSoon,
  listFeatured,
  priceForPreset,
} from "@/lib/cosmetics";
import { Alert } from "react-native";
import { analytics, flags, haptics, purchases } from "@/services";

type Tab = CosmeticCategory | "bundles";

const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { id: "kit", label: "Kits", icon: "user" },
  { id: "crest", label: "Crests", icon: "shield" },
  { id: "pitch", label: "Pitch", icon: "grid" },
  { id: "celebration", label: "FX", icon: "star" },
  { id: "uiTheme", label: "Themes", icon: "droplet" },
  { id: "banner", label: "Banners", icon: "flag" },
  { id: "bundles", label: "Bundles", icon: "package" },
];

const PRICING_PRESETS = ["default", "soft_launch", "promo"] as const;
type PricingPreset = (typeof PRICING_PRESETS)[number];

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, purchaseCosmetic, purchaseBundle, equipCosmetic, applyRestoredEntitlements } = useGame();
  const [tab, setTab] = useState<Tab>("kit");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const top = Platform.OS === "web" ? 24 : insets.top + 12;

  const shopVisible = flags.bool("shop_visible");
  const pricingPresetRaw = flags.variant("cosmetic_pricing_preset");
  const pricingPreset: PricingPreset = (PRICING_PRESETS as readonly string[]).includes(
    pricingPresetRaw,
  )
    ? (pricingPresetRaw as PricingPreset)
    : "default";

  useEffect(() => {
    analytics.track("shop_viewed", { pricingPreset });
  }, [pricingPreset]);

  const ownedSet = useMemo(() => new Set(state.cosmetics.owned), [state.cosmetics.owned]);
  const equippedMap = state.cosmetics.equipped;

  if (!shopVisible) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="chevron-down" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Cosmetics</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.emptyWrap]}>
          <Feather name="lock" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Shop unavailable</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            The cosmetics shop is currently turned off. Check back soon.
          </Text>
        </View>
      </View>
    );
  }

  function showToast(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 1800);
  }

  function handlePreview(item: CosmeticItem) {
    haptics.fire("tap");
    analytics.track("cosmetic_previewed", { id: item.id, category: item.category });
  }

  function handleBuy(item: CosmeticItem) {
    haptics.fire("tap");
    const result = purchaseCosmetic(item.id);
    if (result.ok) {
      showToast("ok", `${item.name} added to your locker.`);
    } else if (result.reason === "already_owned") {
      showToast("err", "Already owned.");
    } else if (result.reason === "insufficient_funds") {
      showToast(
        "err",
        item.price.currency === "gems" ? "Not enough gems." : "Not enough coins.",
      );
    }
  }

  function handleEquip(item: CosmeticItem) {
    haptics.fire("tap");
    const ok = equipCosmetic(item.id);
    if (ok) showToast("ok", `${item.name} equipped.`);
  }

  function handleBundleBuy(bundleId: string) {
    haptics.fire("tap");
    const bundle = COSMETIC_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return;
    const result = purchaseBundle(bundleId);
    if (result.ok) showToast("ok", `${bundle.name} unlocked.`);
    else if (result.reason === "insufficient_funds")
      showToast(
        "err",
        bundle.price.currency === "gems" ? "Not enough gems." : "Not enough coins.",
      );
    else if (result.reason === "already_owned")
      showToast("err", "You already own every item in this bundle.");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Cosmetics Shop</Text>
        <Pressable
          onPress={async () => {
            haptics.fire("tap");
            try {
              const r = await purchases.restore();
              const grantedInGame = applyRestoredEntitlements(r.productIds);
              const total = Math.max(r.restored, grantedInGame);
              Alert.alert(
                "Restore complete",
                total > 0
                  ? `Restored ${total} item${total === 1 ? "" : "s"}.`
                  : "Nothing to restore on this device.",
              );
            } catch (e) {
              Alert.alert("Restore failed", e instanceof Error ? e.message : "Try again later.");
            }
          }}
          hitSlop={10}
        >
          <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={[styles.balanceRow]}>
        <Balance icon="dollar-sign" label="COINS" value={state.coins} tone={colors.accent} />
        <Balance icon="hexagon" label="GEMS" value={state.gems} tone="#B36BFF" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => {
                setTab(t.id);
                if (t.id === "bundles") {
                  for (const b of COSMETIC_BUNDLES)
                    analytics.track("bundle_viewed", { id: b.id });
                }
              }}
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
                size={13}
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
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <FeaturedRail
          pricingPreset={pricingPreset}
          ownedSet={ownedSet}
          onBuy={handleBuy}
          onEquip={handleEquip}
        />

        <CategoryProgress category={tab} ownedSet={ownedSet} />

        {tab === "bundles" ? (
          COSMETIC_BUNDLES.map((b) => {
            const adjusted = priceForPreset(b.price, pricingPreset);
            const containedNames = b.itemIds
              .map((id) => getCosmetic(id)?.name ?? "—")
              .join(" + ");
            return (
              <View
                key={b.id}
                style={[
                  styles.bundleCard,
                  { backgroundColor: colors.card, borderColor: RARITY_COLOR[b.rarity] },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bundleName, { color: colors.foreground }]}>{b.name}</Text>
                  <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
                    {b.description}
                  </Text>
                  <Text style={[styles.bundleContains, { color: colors.mutedForeground }]}>
                    Includes: {containedNames}
                  </Text>
                  <View style={[styles.savingsChip, { borderColor: colors.primary }]}>
                    <Feather name="trending-down" size={11} color={colors.primary} />
                    <Text style={[styles.savingsText, { color: colors.primary }]}>
                      Save {b.savingsPct}%
                    </Text>
                  </View>
                </View>
                <PriceButton
                  price={adjusted}
                  label="Buy bundle"
                  onPress={() => handleBundleBuy(b.id)}
                />
              </View>
            );
          })
        ) : (
          <>
            <CategoryList
              category={tab}
              ownedSet={ownedSet}
              equippedId={equippedMap[tab]}
              pricingPreset={pricingPreset}
              onPreview={handlePreview}
              onBuy={handleBuy}
              onEquip={handleEquip}
            />
            <ComingSoonRail category={tab} />
          </>
        )}
      </ScrollView>

      {toast && (
        <View
          style={[
            styles.toast,
            {
              borderColor: toast.kind === "ok" ? colors.primary : colors.destructive,
              backgroundColor: colors.card,
              bottom: insets.bottom + 24,
            },
          ]}
        >
          <Feather
            name={toast.kind === "ok" ? "check-circle" : "alert-circle"}
            size={14}
            color={toast.kind === "ok" ? colors.primary : colors.destructive}
          />
          <Text style={[styles.toastText, { color: colors.foreground }]}>{toast.text}</Text>
        </View>
      )}
    </View>
  );
}

function Balance({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: number;
  tone: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.balancePill, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={13} color={tone} />
      <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.balanceValue, { color: colors.foreground }]}>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

function CategoryList({
  category,
  ownedSet,
  equippedId,
  pricingPreset,
  onPreview,
  onBuy,
  onEquip,
}: {
  category: CosmeticCategory;
  ownedSet: Set<string>;
  equippedId: string | undefined;
  pricingPreset: PricingPreset;
  onPreview: (item: CosmeticItem) => void;
  onBuy: (item: CosmeticItem) => void;
  onEquip: (item: CosmeticItem) => void;
}) {
  const colors = useColors();
  const items = listByCategory(category);
  if (items.length === 0) {
    return (
      <View style={[styles.emptyWrap]}>
        <Feather name="inbox" size={28} color={colors.mutedForeground} />
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          No {CATEGORY_LABEL[category].toLowerCase()} available yet.
        </Text>
      </View>
    );
  }
  const ownedCount = items.filter((i) => ownedSet.has(i.id)).length;

  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        {CATEGORY_LABEL[category]} • {ownedCount}/{items.length} owned
      </Text>
      {items.map((item) => {
        const owned = ownedSet.has(item.id);
        const equipped = equippedId === item.id;
        const adjusted = priceForPreset(item.price, pricingPreset);
        return (
          <ItemCard
            key={item.id}
            item={item}
            adjustedPrice={adjusted}
            owned={owned}
            equipped={equipped}
            onPreview={() => onPreview(item)}
            onBuy={() => onBuy(item)}
            onEquip={() => onEquip(item)}
          />
        );
      })}
    </>
  );
}

function ItemCard({
  item,
  adjustedPrice,
  owned,
  equipped,
  onPreview,
  onBuy,
  onEquip,
}: {
  item: CosmeticItem;
  adjustedPrice: CosmeticItem["price"];
  owned: boolean;
  equipped: boolean;
  onPreview: () => void;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const colors = useColors();
  const rc = RARITY_COLOR[item.rarity];
  return (
    <Pressable onPress={onPreview} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: equipped ? colors.primary : colors.border,
          },
        ]}
      >
        <LinearGradient
          colors={[item.accent + "55", rc + "10"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.thumb}
        >
          <Feather name="package" size={26} color={rc} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.rarityChip, { borderColor: rc }]}>
              <Text style={[styles.rarityText, { color: rc }]}>
                {item.rarity.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.cardBtnRow}>
            {equipped ? (
              <View style={[styles.equippedChip, { borderColor: colors.primary }]}>
                <Feather name="check" size={11} color={colors.primary} />
                <Text style={[styles.equippedText, { color: colors.primary }]}>Equipped</Text>
              </View>
            ) : owned ? (
              <Pressable
                onPress={onEquip}
                style={({ pressed }) => [
                  styles.equipBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Feather name="check" size={11} color="#0A0E1A" />
                <Text style={styles.equipText}>Equip</Text>
              </Pressable>
            ) : (
              <PriceButton price={adjustedPrice} label="Buy" onPress={onBuy} />
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function FeaturedRail({
  pricingPreset,
  ownedSet,
  onBuy,
  onEquip,
}: {
  pricingPreset: PricingPreset;
  ownedSet: Set<string>;
  onBuy: (item: CosmeticItem) => void;
  onEquip: (item: CosmeticItem) => void;
}) {
  const colors = useColors();
  const items = listFeatured();
  if (items.length === 0) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Featured</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 12 }}
      >
        {items.map((item) => {
          const owned = ownedSet.has(item.id);
          const adjusted = priceForPreset(item.price, pricingPreset);
          const rc = RARITY_COLOR[item.rarity];
          return (
            <View
              key={item.id}
              style={[
                {
                  width: 200,
                  borderWidth: 1,
                  borderColor: rc,
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 12,
                },
              ]}
            >
              <LinearGradient
                colors={[item.accent + "55", rc + "10"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.thumb, { width: "100%", height: 70 }]}
              >
                <Feather name="star" size={22} color={rc} />
              </LinearGradient>
              <Text style={[styles.cardName, { color: colors.foreground, marginTop: 8 }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={{ marginTop: 8, flexDirection: "row" }}>
                {owned ? (
                  <Pressable
                    onPress={() => onEquip(item)}
                    style={({ pressed }) => [
                      styles.equipBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <Feather name="check" size={11} color="#0A0E1A" />
                    <Text style={styles.equipText}>Equip</Text>
                  </Pressable>
                ) : (
                  <PriceButton price={adjusted} label="Buy" onPress={() => onBuy(item)} />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CategoryProgress({
  category,
  ownedSet,
}: {
  category: Tab;
  ownedSet: Set<string>;
}) {
  const colors = useColors();
  if (category === "bundles") return null;
  const total = categoryTotal(category);
  if (total === 0) return null;
  const owned = listByCategory(category).filter((i) => ownedSet.has(i.id) && !i.comingSoon).length;
  const pct = Math.round((owned / total) * 100);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingHorizontal: 4,
      }}
    >
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>
        Collection · {owned}/{total}
      </Text>
      <View
        style={{
          width: 110,
          height: 6,
          backgroundColor: colors.muted,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: colors.primary,
          }}
        />
      </View>
    </View>
  );
}

function ComingSoonRail({ category }: { category: Tab }) {
  const colors = useColors();
  if (category === "bundles") return null;
  const items = listComingSoon().filter((i) => i.category === category);
  if (items.length === 0) return null;
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Coming soon</Text>
      {items.map((item) => {
        const rc = RARITY_COLOR[item.rarity];
        return (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: 0.85,
              },
            ]}
          >
            <LinearGradient
              colors={[item.accent + "33", rc + "10"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.thumb}
            >
              <Feather name="clock" size={22} color={rc} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={[styles.equippedChip, { borderColor: colors.border, alignSelf: "flex-start", marginTop: 6 }]}>
                <Feather name="clock" size={11} color={colors.mutedForeground} />
                <Text style={[styles.equippedText, { color: colors.mutedForeground }]}>
                  Coming soon
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PriceButton({
  price,
  label,
  onPress,
}: {
  price: CosmeticItem["price"];
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const isGems = price.currency === "gems";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.priceBtn,
        {
          backgroundColor: isGems ? "#B36BFF" : colors.primary,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Feather name={isGems ? "hexagon" : "dollar-sign"} size={11} color="#0A0E1A" />
      <Text style={styles.priceText}>
        {price.amount.toLocaleString()} {label ? `· ${label}` : ""}
      </Text>
    </Pressable>
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
  balanceRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
  },
  balanceLabel: { fontSize: 9, letterSpacing: 0.6, fontFamily: "Inter_600SemiBold" },
  balanceValue: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: "auto" },
  tabRow: {
    paddingHorizontal: 12,
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
    flexDirection: "row",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  bundleCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: "center",
  },
  bundleName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bundleContains: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: "Inter_500Medium",
  },
  savingsChip: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
  },
  savingsText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardName: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  rarityChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  rarityText: { fontSize: 9, letterSpacing: 0.6, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  cardBtnRow: { flexDirection: "row", marginTop: 8, gap: 6 },
  equipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  equipText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0A0E1A" },
  equippedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  equippedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  priceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  priceText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0A0E1A" },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyBody: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", maxWidth: 260 },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toastText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
