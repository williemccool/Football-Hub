# Cohort configuration

## Where it lives
- **Tester cohort** — `services/tester.ts` (`TesterProfile.cohort`). Chosen
  per-install, defaults from the build channel, switched in
  `Settings → Tester profile`.
- **Cohort flag overrides** — `services/featureFlags.ts` (`COHORT_OVERRIDES`).
  Maps a cohort id to a partial flag set.
- **Live-ops overrides (per-install)** — `services/featureFlags.ts`
  (`overrides`). Set via `flags.setOverride(...)`, persisted in cache,
  surfaced in `Settings → Economy & live-ops`.

## Cohort ids in use

| Cohort | Internal? | Default flags |
|---|---|---|
| `internal-dev` | yes | `ops_admin_visible=true`, `session_sentiment_prompt=false` |
| `internal-qa` | yes | `ops_admin_visible=true` |
| `alpha-wave-1` | no | `slash_hazard_intensity="default"` |
| `alpha-wave-2` | no | (registry defaults) |
| `beta` | no | (registry defaults) |

Add a new cohort by:

1. Adding it to the cycle list in `app/settings.tsx#cycleCohort`.
2. Optionally adding a row to `COHORT_OVERRIDES` in
   `services/featureFlags.ts` for cohort-specific defaults.
3. Documenting the new row in this table and in `ALPHA_TEST_PLAN.md`.

## Experiment groups
`TesterProfile.experimentGroup` is reserved for A/B test arms. When set,
the value is propagated on every analytics event as `experimentGroup`.
Live-ops can use it to slice metrics without changing cohort membership.

## Adding a new feature flag

1. Add an entry to `REGISTRY` in `services/featureFlags.ts`.
2. Read the value at the call site via `flags.bool("...")` or
   `flags.variant("...")`.
3. Optionally add a default override in `COHORT_OVERRIDES`.
4. Document the new flag in `INCIDENT_RESPONSE.md` if it qualifies as a
   kill-switch.
