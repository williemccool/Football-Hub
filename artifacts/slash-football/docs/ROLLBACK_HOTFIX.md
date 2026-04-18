# Rollback / hotfix runbook

## Fast paths (no app rebuild required)

| Symptom | Fastest mitigation |
|---|---|
| Shop UX regression / scary copy | `shop_visible = false` |
| Pass exposes wrong reward | `pass_visible = false` |
| Onboarding broken | `tutorial_enabled = false` |
| Slash too punishing | `slash_hazard_intensity = "low"` |
| Reminder bar misfires | `reminder_bar_visible = false` |
| Sentiment prompt at a bad time | `session_sentiment_prompt = false` |
| Live-ops/admin surface visible to wrong cohort | `ops_admin_visible = false` |
| Economy regression | revert `BALANCE_PRESET_KEY` to `baseline` via Settings → Economy |

These flags are persisted per install via `flags.setOverride`. Cohort-wide
rollouts are documented in `COHORT_CONFIG.md`.

## App-rebuild path (hotfix build)

1. Branch from the production tag.
2. Cherry-pick or write the minimal fix.
3. Bump `expo` build number (iOS) and version code (Android). Do NOT bump
   the marketing version unless the change is user-visible content.
4. Run `pnpm --filter @workspace/slash-football exec tsc --noEmit`.
5. Run a manual smoke test against `BETA_READINESS.md` "First-run
   experience" + "Monetization" sections.
6. Build alpha, push to internal testers; verify on at least one iOS and
   one Android device.
7. Promote to production with a phased rollout (5 % → 20 % → 50 % → 100 %)
   on Google Play; "Reset summary" on Apple if mid-review.

## Server / sync rollback

If the backend is the failing component:

1. Set `EXPO_PUBLIC_API_URL` empty / unreachable to force `local-only`
   mode (the sync service falls back automatically and emits
   `offline_mode_used`).
2. Pin clients to the last known-good schema by reverting the relevant
   migration and shipping a hotfix client.
3. Re-enable the backend once health checks pass; clients reconcile via
   the existing 409-conflict path.

## Save-data corruption

1. If a tester reports save loss: collect their `installId` and last-known
   server snapshot timestamp.
2. Restore from server snapshot if newer; otherwise from local cache.
3. If both are corrupted, walk them through `Settings → Reset progress`
   only as a last resort, after confirming a screenshot of their previous
   state is captured.

## Postmortem discipline
Every rollback or hotfix gets a blameless postmortem within 5 working days
following the format in `INCIDENT_RESPONSE.md`.
