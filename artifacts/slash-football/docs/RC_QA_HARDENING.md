# Release Candidate QA Hardening

Use this list before promoting a build from beta → release candidate →
production. Each row is a real failure mode the codebase already
defends against; use it as the manual smoke matrix and as the bug
template format ("symptom / expected / actual / repro").

## Edge cases (verify on every RC build)

- [ ] **Interrupted slash run** — backgrounding the app mid-run does
      not double-spend a ticket and does not duplicate the reward
      payload.
- [ ] **Duplicate reward claim** — tapping "Claim" on the same daily
      objective twice never grants the reward twice (`m.claimed`
      guard).
- [ ] **Offline → reconnect during reward** — `sync.push` queues
      writes; reconnection drains in order; no state loss after
      airplane-mode toggle.
- [ ] **Season rollover edge case** — finishing matchday N where
      N === totalMatchdays awards the season prize, sets
      `season.finished`, and `startNewSeason()` resets pass ownership +
      claimed tier arrays.
- [ ] **Pass entitlement edge case** — buying premium then refunding
      (placeholder adapter equivalent: `purchases.clearAll()`) leaves
      already-claimed tiers intact and free track unaffected.
- [ ] **Owned cosmetic equip** — equipping a cosmetic the user does
      not own is rejected by `equipCosmetic` (`owned` membership
      check).
- [ ] **Migration / version mismatch** — `hydrateFromLoaded` merges
      missing fields against `createInitialState` defaults so loading
      a stale save never crashes.
- [ ] **Replay payload missing/corrupt** — `match.tsx` tolerates a
      missing `objectStorage` replay; UI falls back to the last result
      summary.
- [ ] **Sync 409 conflict** — server-authoritative state replaces
      local; UI re-renders without a stuck spinner
      (`sync.consumeServerState`).

## Defensive programming touchpoints

- **Validation** — purchase actions require `getCosmetic` / `getBundle`
  to resolve; missing ids return `not_found`, never throw.
- **Fallback states** — when `shop_visible` flag is off, the shop
  renders a friendly "Shop unavailable" view instead of an error.
- **Loading states** — `GameProvider` keeps a `loading` flag so
  consumers can suppress hub renders until hydration succeeds.
- **Empty states** — empty squad / empty schedule / empty results lists
  all render placeholder copy, never empty white space.
- **Retry flows** — restore purchases surfaces a retry-friendly
  "Restore failed" alert instead of a silent failure.
- **Error surfacing** — `errorLogging` swallows expected promise
  rejections (sync, push) but logs unexpected ones; the in-game user
  is never shown a stack trace.

## Cleanup checklist

- [ ] Remove dev-only console logs that survived alpha.
- [ ] Confirm `flags.bool("ops_admin_visible")` defaults to `__DEV__`
      so production cohorts cannot reach the admin/economy pages.
- [ ] Strip stale TODOs that were resolved during this pass.
- [ ] Confirm typings have no `any` leaks in monetization paths
      (`purchaseCosmetic`, `purchaseBundle`, `claimPassReward`).
- [ ] Re-read architecture comments at the top of each `services/*.ts`
      and `lib/*.ts` to confirm they still describe the file.
- [ ] Run `pnpm exec tsc --noEmit` from `artifacts/slash-football/`.

## Admin / dev gating

- [ ] Admin route is hidden unless `ops_admin_visible` flag is on.
- [ ] Economy route is hidden unless `ops_admin_visible` flag is on.
- [ ] Tester profile cohort can be cycled in Settings (internal use).
- [ ] Debug screen reachable only via Settings → "Sync & debug info".
- [ ] Build channel banner shown when `buildChannel !== "production"`.

## Performance / UX polish targets

- App cold start to first hub render: < 2s on a mid-tier device.
- Slash run frame budget: drop nothing below 50fps on a 60Hz device.
- Highlight playback: no jank during marker transitions.
- Shop scroll: no sub-30fps stalls when scrolling featured rail +
  category list together.
- Reward reveal: animation always finishes, never blocks tap-through.

## Sign-off

A build cannot ship as RC unless every "Edge case" box is checked, the
typecheck is clean, and `GO_NO_GO.md` thresholds are met or explicitly
waived with reasons in the release notes.
