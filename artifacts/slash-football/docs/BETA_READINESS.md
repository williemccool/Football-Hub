# Beta readiness checklist

Tick before opening external beta to a new wave.

## App quality
- [ ] Crash-free sessions ≥ 99.5 % over the previous 7 days.
- [ ] Zero unresolved P0 bugs on the candidate build.
- [ ] ≤ 3 unresolved P1 bugs, all with documented workarounds.
- [ ] Save migration smoke test passes from the lowest supported state version.
- [ ] App launches in < 4 s cold-start on a low-end Android device class.

## First-run experience
- [ ] Onboarding completes end-to-end on iOS + Android + web.
- [ ] `onboarding_completed` and `club_created` events fire and reach the analytics ring buffer.
- [ ] User can finish a slash run, claim rewards, and play a match within 5 minutes.
- [ ] Empty states render on hub, squad, league, fixtures, shop, pass.

## Settings + support
- [ ] Build label, channel, environment, install id, cohort all visible in Settings.
- [ ] "Send feedback" and "Report an issue" entries reach the feedback queue.
- [ ] Sync status is honest (online / offline / migrating / error).
- [ ] Support email + privacy + terms links resolve to real URLs.

## Monetization (cosmetics-first)
- [ ] Shop is reachable and gated on the `shop_visible` flag.
- [ ] Pass is reachable and gated on the `pass_visible` flag.
- [ ] No catalog item priced in real money in the candidate build.
- [ ] Gem balance is purely earned at this stage (no purchase entry yet).
- [ ] Equip / preview / purchase flows do not crash on low memory.

## Live-ops controls
- [ ] All kill-switch flags toggleable (see `docs/INCIDENT_RESPONSE.md`).
- [ ] Active balance preset is `baseline` unless an explicit experiment is logged.
- [ ] Cohort cycle in Settings reaches every supported cohort id.

## Analytics sanity
- [ ] All entries in `docs/ANALYTICS_SANITY.md` checked end-to-end.
- [ ] Every event carries `installId`, `cohort`, `buildChannel`, `environment`.

## Sign-off
PM ___ / Eng ___ / QA ___ / Date ___ / Build ___
