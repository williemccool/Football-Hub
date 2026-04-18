# Bug triage

## Severity ladder

| Sev | Definition | Response time | Examples |
|---|---|---|---|
| P0 | Blocks core loop for any tester. | < 4 h | Crash on launch, unable to play match, save corruption. |
| P1 | Blocks a core loop for some testers, or causes economy/balance regression. | < 24 h | Tickets never refill on iPad, matches always tie, scout intel never consumed. |
| P2 | Annoying but not blocking. | < 5 days | Wrong copy, sub-optimal animation, inconsistent capitalisation. |
| P3 | Nice-to-fix polish. | Backlog | Hover state on web, minor easing tweak. |

## Triage flow

1. Issue arrives via `feedback_submitted.kind=report_issue` or async chat.
2. Capture: `installId`, `cohort`, `buildChannel`, `appVersion`, screen + repro.
3. Reproduce on the latest alpha build.
4. Assign severity using the ladder above.
5. Tag with subsystem: `slash`, `match`, `squad`, `economy`, `sync`,
   `notifications`, `ui`, `infra`.
6. P0/P1 → patch on the alpha branch and ship a hotfix build immediately.
7. P2/P3 → batch into next regular alpha build.

## Definition of fixed
- Reproduction documented in the ticket.
- Fix verified on the device class that originally hit it.
- Regression covered by an automated test where feasible (or a manual
  scripted check in the next balance review).

## Escalation
- Two unresolved P0s at any point ⇒ pause new tester invites.
- Five+ unresolved P1s on Wave 2 build ⇒ block beta promotion.
