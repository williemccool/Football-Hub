# Internal audit — Prompt C (alpha-readiness) coverage

Recorded as of the v1 / beta-readiness pass.

## Status legend
- ✅ Completed in alpha-readiness phase.
- 🟡 Partially complete — completed in this v1 pass.
- 🔴 Missing — newly implemented in this v1 pass.

## Coverage table

| Area | Status | Where it lives |
|---|---|---|
| Build / env labels | ✅ | `services/tester.ts` (label, channel, env) + Settings banner |
| Tester profile (install id, cohort) | ✅ | `services/tester.ts` + Settings cohort cycler |
| Analytics base attached to every event | ✅ | `services/tester.ts#analyticsBase` + `services/analytics.ts#track` |
| Cohort overrides for flags | ✅ | `services/featureFlags.ts#COHORT_OVERRIDES` |
| Feature flag registry + variants | ✅ (expanded) | `services/featureFlags.ts` (now includes 8 new launch flags) |
| Live-ops admin surface | ✅ | `app/economy.tsx` (flag-gated by `ops_admin_visible`) |
| Feedback capture (categories + queue) | ✅ | `services/feedback.ts` + `app/feedback.tsx` |
| Sentiment prompts | ✅ | `components/SentimentPrompt.tsx` mounted in match + scout |
| Notification trigger plumbing | ✅ (expanded) | `services/notifications.ts` (added pass / cosmetic / objectives reset triggers) |
| Reminder bar + next-best-action | ✅ | `components/ReminderBar.tsx` + hub `index.tsx` |
| Balance presets | ✅ | `lib/balancePresets.ts` + `app/economy.tsx` |
| Economy dashboard | ✅ | `app/economy.tsx` |
| Retention hooks (next best action) | ✅ | `lib/retentionHooks.ts` |
| Launch docs (alpha) | ✅ | `docs/ALPHA_TEST_PLAN`, `KPI_TARGETS`, `BALANCE_REVIEW`, `BUG_TRIAGE`, `INCIDENT_RESPONSE`, `GO_NO_GO`, `RELEASE_NOTES_TEMPLATE`, `COHORT_CONFIG` |
| KPI funnel — onboarding | 🟡 → ✅ | Added `club_created` track at end of onboarding |
| KPI funnel — match highlights | 🟡 → ✅ | Added `highlight_view_started` / `highlight_view_completed` in `app/match.tsx` |
| KPI funnel — monetization | 🔴 → ✅ | Added `cosmetic_previewed`, `cosmetic_equipped`, `cosmetic_purchase_attempted`, `pass_viewed`, `pass_reward_claimed`, `pass_premium_purchased`, `bundle_viewed`, `gems_balance_viewed` |
| Cosmetics catalog model | 🔴 → ✅ | `lib/cosmetics.ts` (categories, rarity, price, bundles) |
| Premium currency (gems) | 🔴 → ✅ | `gems` field on `GameState`, surfaced in shop / hub |
| Cosmetic equip + preview flow | 🔴 → ✅ | `app/shop.tsx` (rewritten) + `cosmetics` field on `GameState` |
| Season pass scaffolding | 🔴 → ✅ | `lib/seasonPass.ts` + `app/pass.tsx` + `seasonPass` field on `GameState` |
| Bundles / limited-time offer model | 🔴 → ✅ | `lib/cosmetics.ts#COSMETIC_BUNDLES` + shop bundle row |
| Onboarding speed variant | 🔴 → ✅ | `onboarding_speed` flag respected in `app/onboarding.tsx` |
| Shop-CTA frequency control | 🔴 → ✅ | `shop_cta_frequency` flag throttles hub shop banner |
| Shop / pass visibility kill-switches | 🔴 → ✅ | `shop_visible`, `pass_visible` flags |
| Beta / release / monetization / app-store / analytics-sanity / rollback docs | 🔴 → ✅ | New docs in `docs/` |
| Economy fairness review | 🔴 → ✅ | `docs/ECONOMY_FAIRNESS_REVIEW.md` |
| App-store metadata + review notes placeholders | 🔴 → ✅ | `docs/APP_STORE_METADATA.md`, `docs/REVIEW_NOTES_TEMPLATE.md`, `docs/PRIVACY_PLACEHOLDER.md` |

## Remaining (post-launch, not blocking soft launch)
- Real IAP adapter (StoreKit / Play Billing) — wires into `cosmetic_purchase_attempted` once a price has `currency: "real"`.
- Real push delivery adapter — `notifications.subscribeOutgoing` already exposes the contract; just needs an APNs/FCM/OneSignal subscriber.
- Replays surface (`objectStorage.putReplay` already persists; UI surface intentionally deferred).
- Localisation pass for first launch markets.
