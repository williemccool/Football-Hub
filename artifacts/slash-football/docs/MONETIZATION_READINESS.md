# Monetization readiness checklist

Slash Football's launch monetization is **cosmetics-first**. This list keeps
that contract honest.

## Fairness invariants (do not violate)
- No catalog item grants player rating, stats, ceilings, ratings boosters,
  upgrade discounts, or matchday advantages.
- No item bypasses the ticket cap or shortens cooldowns in the competitive
  loop.
- Gems may not be spent on progression. The catalog enforces this — every
  gem-priced item is in the cosmetics categories only.
- The season pass premium track may include small currency rewards
  (capped via `applyGenerosity`), but they cannot exceed equivalent free
  play earnings for the same time investment.
- Bundles must reflect a real saving vs the sum of contained items.

## Catalog hygiene
- [ ] Every `CosmeticItem` has a non-empty name + description.
- [ ] Every item belongs to one of the six approved categories
      (kit, crest, pitch, celebration, uiTheme, banner).
- [ ] Rarity distribution checked: not >40 % legendary in any category.
- [ ] Coin-priced items are reachable through ≤ 7 days of normal play.
- [ ] Gem-priced items are reachable through ≤ 30 days of normal play OR
      via a future paid gem pack.
- [ ] No real-money price baked into a v1 build.

## Pass hygiene
- [ ] Free track has at least one reward in every 2 tiers.
- [ ] Premium track is at least 60 % cosmetic by reward count.
- [ ] Premium-track currency rewards capped per `pass_reward_generosity`
      preset.
- [ ] Pass premium upgrade does not fast-forward unearned XP — claiming
      retroactive premium rewards is allowed; gating tiers is not.

## UX hygiene
- [ ] Shop is gated behind `shop_visible`; pass is gated behind
      `pass_visible`. Both can be killed in seconds.
- [ ] `shop_cta_frequency` throttles any in-game shop nudge to at most
      once per session by default.
- [ ] Owned cosmetics are never re-offered for purchase.
- [ ] "Equip" is one tap from "Owned" state.
- [ ] No dark-pattern modals (auto-dismiss CTAs, mis-aligned close
      buttons, fake urgency timers without a real `limitedUntil`).
- [ ] Pricing is shown in player-readable currency labels (coins / gems),
      never raw numbers without unit.

## Instrumentation
- [ ] `shop_viewed` fires on shop mount.
- [ ] `cosmetic_previewed` fires on item tap.
- [ ] `cosmetic_equipped` fires on equip.
- [ ] `cosmetic_purchase_attempted` fires on purchase tap (success or fail).
- [ ] `bundle_viewed` fires on bundle row tap.
- [ ] `pass_viewed` fires on pass mount.
- [ ] `pass_reward_claimed` fires on each reward claim.
- [ ] `pass_premium_purchased` fires on premium upgrade tap.
- [ ] `gems_balance_viewed` fires when the gem pill is rendered on the hub.

## Compliance / store
- [ ] No mention of "loot box", "mystery box", or random odds without
      published rates (we do not ship random monetization at v1).
- [ ] Currency cannot be transferred between accounts.
- [ ] A clear "no real money in v1" line appears in the privacy / terms
      placeholders until IAP ships.

## Sign-off
PM ___ / Eng ___ / Legal ___ / Date ___
