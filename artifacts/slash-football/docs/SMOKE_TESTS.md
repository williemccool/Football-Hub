# Smoke Tests — Slash Football

Run these on a real device before any release candidate build.

## 1. Cold launch
- [ ] App opens to the splash screen with the Slash Football crest pulsing
- [ ] Splash transitions cleanly to either onboarding (first run) or the Hub
- [ ] No console errors related to fonts, icons, or assets

## 2. Onboarding
- [ ] Five steps render with icons and copy
- [ ] Skip button completes the flow and writes the completion flag
- [ ] On second launch the onboarding does NOT re-appear

## 3. Hub
- [ ] Coins, manager level, season, matchday display correctly
- [ ] Tickets refill timer counts down
- [ ] Settings gear opens the Settings screen
- [ ] Daily missions display and `Claim` works once `done`

## 4. Slash arena
- [ ] Spending a ticket starts the run (`slash_run_started`)
- [ ] Slicing a ball produces light haptics on iOS
- [ ] Combo tier increase produces medium haptics
- [ ] Hazards produce warning haptics
- [ ] End-of-run reveal grants coins / shards / essence
- [ ] Best score updates on Hub

## 5. Squad / Player
- [ ] Squad list scrolls smoothly with 25+ players
- [ ] Tapping a player opens the detail modal
- [ ] Upgrade button requires the correct coin amount
- [ ] Trait forge requires 3 trait fragments
- [ ] "Add to starting lineup" places the player in a same-role slot

## 6. Lineup & Tactics
- [ ] Lineup modal shows 11 slots with role labels
- [ ] Removing a player (tap) clears the slot
- [ ] Tactics modal saves formation/style/pressing/tempo

## 7. Match
- [ ] Play Match runs the simulation and renders highlights
- [ ] Result updates the league table
- [ ] Replay payload is persisted (visible in `/debug` "Cached replays")

## 8. League
- [ ] League table sorts correctly
- [ ] Player rank highlighted
- [ ] Start new season resets standings and bumps season number

## 9. Settings
- [ ] Haptics toggle persists across app restart
- [ ] Reset progress confirms then wipes everything
- [ ] Privacy / Terms / Support links open in the system browser
- [ ] Sync status updates live

## 10. Sync resilience
- [ ] Toggle airplane mode mid-session — state still saves locally
- [ ] Re-enabling network drains the pending queue (check `/debug`)
- [ ] Force-killing the app and reopening preserves all progress

## 11. Cosmetics shop
- [ ] All four tabs (kits, crests, pitch, celebrations) render
- [ ] Items display rarity badges
- [ ] No purchase flow yet (placeholder screen)

## 12. Error handling
- [ ] Triggering a JS exception is caught by `ErrorBoundary` and shows the fallback
- [ ] Recovering returns to a working state
