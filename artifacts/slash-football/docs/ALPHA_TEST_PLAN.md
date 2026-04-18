# Slash Football — Alpha Test Plan

## Goal
Validate that core loops (slash → squad → match → season) feel coherent, the
economy is balanced for a 7-day session-pattern, and the build is stable enough
on real devices to graduate to closed beta.

## Phasing

| Wave | Audience | Size | Duration | Channel | Cohort id |
|---|---|---|---|---|---|
| Internal QA | Studio + close advisors | ≤ 15 | 5 days | dev / alpha | `internal-qa` |
| Alpha Wave 1 | Hand-picked external testers (mid-core fans) | 50 – 80 | 10 days | alpha | `alpha-wave-1` |
| Alpha Wave 2 | Wider invite list incl. casual football fans | 150 – 200 | 14 days | alpha | `alpha-wave-2` |
| Closed Beta gate | Above + retention thresholds met | — | — | beta | `beta` |

Cohorts are set per-tester via the in-app `Settings → Tester profile` row and
exposed as `cohort` on every analytics event for slicing.

## Daily test scenarios (per tester)
1. Cold-start the app once per real-world day for at least 4 of 7 days.
2. Burn the ticket cap at least once per session.
3. Play every available matchday before the session ends.
4. Submit at least one `report_issue` or `send_feedback` entry by Day 3.
5. Respond to the in-app sentiment prompt at least once.

## Builds
- All testers receive the **alpha** channel build labelled
  `Alpha <version> (<build>) · staging` in Settings.
- Each new build bumps the build number; release notes go in
  `docs/RELEASE_NOTES_TEMPLATE.md` per build.

## Communication
- Async channel (Discord / private group) for chat feedback.
- In-app feedback (Settings → Send feedback / Report issue) is the canonical
  source — it carries `installId`, `cohort`, `buildChannel`, and `appVersion`
  automatically.

## Exit criteria → see `GO_NO_GO.md`.
