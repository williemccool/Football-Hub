# Analytics sanity checklist

Run end-to-end on a candidate build before promoting it. Every event below
must reach the analytics console with the documented props plus the standard
base props (`installId`, `cohort`, `buildChannel`, `environment`,
`appVersion`, `sessionCount`, `experimentGroup`).

## Foundational
- [ ] `app_open` — fires on every cold-start AND every foreground.
- [ ] `onboarding_started` — first time onboarding mounts.
- [ ] `onboarding_completed` — finishing the last step.
- [ ] `onboarding_skipped` — tapping skip; carries `stepReached`.
- [ ] `club_created` — fires once when the user finishes onboarding with a
      `clubName` set (carries `clubName`).

## Slash loop
- [ ] `slash_run_started` — `spendTicket` success.
- [ ] `slash_run_completed` — `runScore`, `peakCombo`, `scoreBand`.
- [ ] `slash_run_score` — `runScore`, `scoreBand`.
- [ ] `slash_reward_claimed` — `coins`, `essence`, `shards`, `injuries`.

## Squad / progression
- [ ] `player_unlocked` — `rarity`, `rating`, `role`.
- [ ] `player_upgraded` — `newRating`.
- [ ] `trait_forged` — `trait`.
- [ ] `lineup_updated` — `slotIndex`, `hasPlayer`.
- [ ] `tactics_updated` — formation / style / pressing / tempo.

## Match
- [ ] `match_started` — fires before sim.
- [ ] `match_completed` — `outcome`, `homeScore`, `awayScore`, `opponent`.
- [ ] `highlight_view_started` — fires when the user opens the post-match
      events / highlights view.
- [ ] `highlight_view_completed` — fires when they finish or close it,
      with `secondsViewed`.

## Season / league
- [ ] `league_table_viewed` — opening the League tab.
- [ ] `daily_objective_claimed` — `id`, `reward`.
- [ ] `season_reward_claimed` — fires when the season closes and any
      rewards land.

## Engagement / retention
- [ ] `reminder_shown` — `trigger`, `id`.
- [ ] `reminder_dismissed` — `id`.
- [ ] `reminder_push_dispatched` — only if a push adapter is wired.
- [ ] `next_action_clicked` — `id`.
- [ ] `sentiment_prompt_shown` / `sentiment_prompt_dismissed` — `surface`,
      `rating?`.
- [ ] `feedback_submitted` — `kind`, `category`.

## Monetization funnel
- [ ] `shop_viewed` — opening the shop.
- [ ] `cosmetic_previewed` — `id`, `category`.
- [ ] `cosmetic_equipped` — `id`, `category`.
- [ ] `cosmetic_purchase_attempted` — `id`, `currency`, `amount`,
      `outcome` ("success" | "insufficient_funds" | "already_owned").
- [ ] `bundle_viewed` — `id`.
- [ ] `pass_viewed` — opening the pass screen.
- [ ] `pass_reward_claimed` — `tier`, `track` ("free" | "premium"),
      `kind`.
- [ ] `pass_premium_purchased` — placeholder event for premium track
      unlock.
- [ ] `gems_balance_viewed` — fires once per session when the hub
      surfaces the gem pill.

## Live-ops / experimentation
- [ ] `feature_flag_overridden` — `id`.
- [ ] `balance_preset_applied` — `preset`.

## Reliability
- [ ] `sync_failed` — fires on push/pull errors.
- [ ] `migration_failed` / `migration_succeeded` — fires on save migration.
- [ ] `offline_mode_used` — fires when network is unavailable.

## Cross-cutting
- [ ] Sample 5 events from the analytics console: confirm `installId` is
      stable across them and `cohort` matches the tester's Settings value.
- [ ] Confirm session count increments on a new cold-start.
