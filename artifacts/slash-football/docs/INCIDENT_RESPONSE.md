# Incident response — alpha

## Roles
- **Incident commander (IC)** — owns comms, single decision-maker for the duration.
- **Scribe** — captures timeline in the incident channel.
- **Engineer** — drives investigation.
- **Comms** — drafts tester-facing message.

## Severity quick map
| Sev | Trigger | Action |
|---|---|---|
| SEV-1 | Save data loss, mass crash, security exposure. | Page everyone, freeze deploys, ship hotfix < 4 h. |
| SEV-2 | Core loop broken on a major device class, > 25 % of cohort affected. | IC + Eng on call, fix < 24 h. |
| SEV-3 | Annoying regression, not blocking. | Track, fix in next normal build. |

## Runbook

1. **Detect** — alert from analytics dashboard, multiple identical
   `report_issue` entries within 1 h, or staff observation.
2. **Acknowledge** — IC posts in #alpha-incidents within 15 min.
3. **Assess** — pull the affected `installId` + `cohort` slice; confirm
   blast radius.
4. **Mitigate** —
   - For runtime regressions: enable a kill-switch via a feature flag
     override (the live-ops `flags.setOverride` API).
   - For balance regressions: revert to the `baseline` preset on
     `Settings → Economy & live-ops`.
   - For backend regressions: `EXPO_PUBLIC_API_URL` may be cleared to fall
     back to local-only mode while we investigate.
5. **Communicate** — short tester-facing note in the alpha channel within
   30 min of detection, follow-up within 2 h.
6. **Resolve** — ship a fix build, confirm with a representative tester
   from the affected cohort.
7. **Postmortem** — within 5 working days; blameless template, action items
   tracked to closure.

## Kill-switch flags (high impact)
- `tutorial_enabled` — disable to skip a broken tutorial path.
- `slash_hazard_intensity = "low"` — soften slash if hazards regress.
- `next_action_banner` — disable hub recommendation banner.
- `session_sentiment_prompt` — silence prompts during a sensitive incident.
- `ops_admin_visible` — toggle live-ops surface visibility.
