# Alpha KPI targets

All KPIs are computed from the local analytics ring buffer for tester
self-service via `Settings → Economy & live-ops`, and from the aggregate
warehouse for staff review.

## Engagement
| Metric | Target | Source |
|---|---|---|
| D1 retention (cohort) | ≥ 55 % | `app_open` per cohort |
| D7 retention (cohort) | ≥ 25 % | `app_open` per cohort |
| Sessions / DAU | 2.0 – 4.0 | `app_open` |
| Avg session length | 4 – 9 min | derived from session start/stop |

## Core loop
| Metric | Target |
|---|---|
| Slash runs / DAU / day | 4 – 8 |
| Avg slash run score | 1 200 – 2 200 |
| Match completion rate | ≥ 90 % of started matches finish |
| Lineup completed before first match | ≥ 80 % of new users by Session 2 |

## Economy
| Metric | Target | Notes |
|---|---|---|
| Avg coins / slash run | 35 – 65 | `slash_reward_claimed.coins` |
| Avg essence / slash run | 1.0 – 2.5 | |
| Avg shards / slash run | 1.5 – 3.0 | |
| Players at ceiling at D7 | ≤ 25 % of squad | inflation guard |
| Coin balance growth / day | flat (±15 %) | inflation guard |
| Injuries / 10 runs | 0.4 – 1.0 | hazard tuning |

## Quality
| Metric | Target |
|---|---|
| Crash-free sessions | ≥ 99 % |
| `feedback_submitted.kind=report_issue` per DAU | ≤ 0.05 |
| Unique unresolved P0 bugs at Wave 2 end | 0 |
| Unique unresolved P1 bugs at Wave 2 end | ≤ 3 |

## Sentiment
| Metric | Target |
|---|---|
| Avg `sentiment_prompt` rating (slash_run_completed) | ≥ 3.8 / 5 |
| Avg `sentiment_prompt` rating (match_completed) | ≥ 3.6 / 5 |
| Sentiment prompt response rate | ≥ 25 % |
