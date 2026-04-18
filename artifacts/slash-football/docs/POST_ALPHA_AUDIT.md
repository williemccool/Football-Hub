# Post-Alpha Product Audit

This audit is **assumptions-based** — it captures the launch-readiness
view at the end of the alpha hardening pass, before real beta cohort
data exists. Once analytics start flowing from external testers, replace
the assumption columns with measured values and re-run the matrix.

The product identity to preserve, end-to-end, is:
**slash → collect → upgrade → squad → match → season**

## Launch strengths

- **Core slash loop is stable.** Hazards, combos, scoring and the
  reward translation (slash → coins / shards / essence) work cleanly.
- **Season + league structure shipped.** Standings, fixtures, season
  rollover and championship reward all loop without manual nudge.
- **Cosmetics-first monetization is enforceable.** All gem-priced rewards
  go through `priceForPreset` inside `GameContext`, and pass premium
  tiers cannot grant essence/trait-fragments/catalysts.
- **Reminder/notification surface is portable.** Triggers exist for
  every retention moment (tickets, matchday, season ending, pass ready,
  cosmetic event) and are routed through a single service.
- **Telemetry coverage is broad.** Funnel events for onboarding, slash
  runs, matches, highlights, shop, pass and monetization are all wired.
- **Build/cohort visibility is real.** Tester profile, build channel
  and environment surface in Settings without exposing internals.

## Likely retention risks

| Risk | Why it matters | Pre-mitigation in build |
|------|---------------|-------------------------|
| Confusing first slash run | First-session abandonment is the worst churn point | Onboarding `compact`/`full` variants, club_created on completion only |
| Unclear "next best action" | Users bounce when the hub doesn't tell them what to do | Hub shows reminders + gems/coins/tickets, plus next fixture |
| Daily refresh missed | Daily cadence is the cheapest D1/D7 lever | `daily_objectives_reset` trigger persists last-seen tag |
| Pass too long to feel | Premium pass bought + no early gratification = refund | Tiers 1–3 deliver tickets/coins quickly; tier 2 swapped to gems |

## Likely economy risks

| Risk | Why it matters | Pre-mitigation in build |
|------|---------------|-------------------------|
| Coin inflation late-season | Upgrade ceilings hit, sinks dry | Cosmetic catalog + bundle prices act as long-term sinks |
| Shard pacing too slow per role | Specific role users feel stuck | Scout intel funnels generic shards to focus role |
| Duplicate fatigue | New player feels worthless once roster is full | Salvage modes (coins / essence / evolution) |
| Pass generosity drift | Live-ops accidentally over-/under-rewards | `pass_reward_generosity` flag (lean / default / generous) |
| Catalyst dead-end | Players hoard catalysts with nothing to spend on | Trait forging consumes fragments; catalysts feed evolution salvage |

## Likely monetization risks

| Risk | Why it matters | Pre-mitigation in build |
|------|---------------|-------------------------|
| P2W creep | Single regression breaks "fair to free players" promise | Cosmetics-only invariant enforced in `purchaseCosmetic`/`claimPassReward` |
| Confusing prices across launch markets | Soft-launch elasticity needs A/B without re-shipping | `cosmetic_pricing_preset` flag (default / soft_launch / promo) |
| Receipts lost on reinstall | Users feel robbed when cosmetics vanish | Purchase service + restore flow exposed in Settings + Shop |
| "Already owned" unclear | Players double-tap then think it failed | Bundle re-buy guard + `already_owned` reason surfaced as toast |

## Likely store / submission risks

| Risk | Why it matters | Pre-mitigation in build |
|------|---------------|-------------------------|
| IAP without restore | Apple rejection, hard | `purchases.restore()` shipped in placeholder + UI |
| No notification opt-out | Stores require category-level controls | `notifications-settings` screen + `notificationPrefs` service |
| Privacy / terms placeholder | Required at submission | Privacy + Terms docs in `/docs`, surfaced in Settings |
| Build/version not visible | Reviewer needs to confirm channel | Settings shows version, build, channel, environment |
| Missing app metadata | Submission blocker | `APP_STORE_METADATA.md`, `APP_STORE_SUBMISSION.md` |

## Recommended fixes applied in this pass

1. **Purchase service abstraction.** New `services/purchases.ts` is
   vendor-neutral with a `placeholder` adapter today and a `store`
   adapter slot for StoreKit / Play Billing. Entitlement bookkeeping is
   local-cache backed and reused by the restore flow.
2. **Centralized entitlements.** `lib/entitlements.ts` exposes
   `ownsCosmetic`, `ownsBundle`, `bundleProgress`, `passPremium`,
   `categoryProgress`, `summarize` so every screen reads the same
   source of truth.
3. **Restore purchases UX.** Visible in Settings ("Restore purchases")
   and as a header action in the Shop modal, with success / failure
   alert states and analytics (`purchases_restored`,
   `purchases_restore_failed`).
4. **Notification settings.** New `notifications-settings` screen +
   `notificationPrefs` service with four categories (gameplay, season,
   shop_pass, marketing). Marketing is off by default. Triggers map to
   categories via `categoryForTrigger` so push and in-app stay coherent.
5. **Catalog readiness.** `featured` and `comingSoon` flags on items
   and bundles, surfaced as a horizontal Featured rail, a Collection
   progress bar per category, and a Coming Soon rail at the bottom of
   each category.
6. **Build / environment visibility.** Settings already shows version,
   build, channel, environment, platform, and a debug entry point —
   verified against this audit.

## What to instrument first when beta data arrives

- **D1 / D3 / D7 retention by cohort.** Crosscheck against onboarding
  variant (`compact`/`full`).
- **First-session funnel:** `app_open → onboarding_completed →
  slash_run_started → slash_run_completed → match_completed →
  highlight_view_completed`.
- **Monetization funnel:** `shop_viewed → cosmetic_purchase_attempted →
  purchase_succeeded`. Same for `pass_viewed → pass_premium_purchased`.
- **Fairness signal:** ratio of paid-cohort-vs-free-cohort wins / table
  position. Should not diverge — cosmetics never alter outcomes.
- **Restore rate.** `purchases_restored` count vs. `purchase_succeeded`
  count gives a strong reinstall-ratio signal.

## Out of scope for this audit

- Real-time multiplayer (explicitly excluded by product direction).
- New gameplay verbs.
- Pay-to-win packs.
- Vendor-locked services (Replit-specific or otherwise).
