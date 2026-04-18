# Go / no-go criteria

Three checkpoints: **Wave 1 → Wave 2**, **Wave 2 → Closed Beta**, and
**Closed Beta → Open Beta / Soft Launch**.

## Universal blockers (any miss ⇒ no-go)

- Any unresolved P0 bug.
- Crash-free session rate < 99 %.
- Save corruption seen on > 0 testers in the last build.
- Sync conflict resolution path failing on more than 1 tester.

## Wave 1 → Wave 2

| Criterion | Threshold |
|---|---|
| Active testers across last 5 days | ≥ 25 |
| D3 retention | ≥ 35 % |
| Sentiment (slash) avg rating | ≥ 3.5 / 5 |
| Sentiment (match) avg rating | ≥ 3.3 / 5 |
| Tickets-burn coverage | ≥ 60 % of testers cap-burnt at least once |
| Open P1 bugs | ≤ 5 |

## Wave 2 → Closed Beta

| Criterion | Threshold |
|---|---|
| Active testers across last 7 days | ≥ 80 |
| D7 retention | ≥ 25 % |
| Sentiment (slash) avg rating | ≥ 3.8 / 5 |
| Sentiment (match) avg rating | ≥ 3.6 / 5 |
| Match completion rate | ≥ 90 % |
| Players-at-ceiling at D7 | ≤ 25 % |
| Open P0 bugs | 0 |
| Open P1 bugs | ≤ 3 |
| Active balance preset | `baseline` (no live overrides) |

## Beta → Soft Launch

| Criterion | Threshold |
|---|---|
| D7 retention | ≥ 30 % |
| Crash-free sessions | ≥ 99.5 % |
| ARPDAU monetisation hooks validated | yes (post-monetisation MVP) |
| Localisation pass for launch markets | complete |
| Privacy / terms links resolve to real URLs | complete |
| Account upgrade (email / social) shipped | complete |

## Sign-off
Each go/no-go review records: build label, cohort sizes, KPI snapshots,
open P0/P1 list, and explicit sign-off from PM + Eng + QA leads.
