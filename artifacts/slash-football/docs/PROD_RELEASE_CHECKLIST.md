# Production release checklist (v1)

Run before promoting a build from beta to production.

## Code & build
- [ ] All beta sign-off items in `BETA_READINESS.md` complete.
- [ ] `app.json` / `expo` config bumped: version, iOS buildNumber, Android versionCode.
- [ ] `EXPO_PUBLIC_BUILD_CHANNEL=production` and `EXPO_PUBLIC_ENV=production` baked into the build.
- [ ] Source maps uploaded to error logging service (or local preserved for triage).
- [ ] Bundle size and asset count reviewed; no dev-only assets shipping.

## Configuration
- [ ] All feature flags reviewed against `docs/COHORT_CONFIG.md`.
- [ ] Live-ops `ops_admin_visible` defaults to `false` for production cohorts.
- [ ] Tester / debug surfaces disabled or hidden behind cohort gates.
- [ ] `EXPO_PUBLIC_API_URL` (if used) points at production backend; cleared = local-only.

## Data & sync
- [ ] Save schema migrations tested against legacy seeds.
- [ ] Server-authoritative state reconciliation tested with a forced 409.
- [ ] Object storage bucket scoped to production keys.
- [ ] No PII collection beyond what is documented in the privacy notice.

## Content / fairness
- [ ] `BALANCE_REVIEW.md` last run is recent (≤ 14 days) and on `baseline` preset.
- [ ] `ECONOMY_FAIRNESS_REVIEW.md` action items addressed or accepted.
- [ ] Cosmetic catalog reviewed: no item leaks into power.
- [ ] Season pass premium track is cosmetics-forward; numeric rewards capped.

## Monetization
- [ ] All items in `MONETIZATION_READINESS.md` complete.
- [ ] Refund / dispute path documented even if IAP is deferred.
- [ ] Currency display order: coins, essence, gems — never lead with gems.

## Compliance
- [ ] Privacy policy URL live and reachable.
- [ ] Terms of service URL live and reachable.
- [ ] Age rating + content notes match `APP_STORE_METADATA.md`.
- [ ] Account deletion path documented (in-app or via support email).

## Communication
- [ ] Release notes drafted (`docs/RELEASE_NOTES_TEMPLATE.md`).
- [ ] Support team briefed on top expected questions.
- [ ] Rollback plan reviewed — see `docs/ROLLBACK_HOTFIX.md`.

## Sign-off
PM ___ / Eng ___ / QA ___ / Compliance ___ / Date ___
