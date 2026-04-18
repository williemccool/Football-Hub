# Balance review checklist

Run end-to-end once per alpha wave. Use the in-app
`Settings → Economy & live-ops` screen to read the live numbers — it
summarises the last 50 analytics events and the active tuning preset.

## Presets in scope
Defined in `lib/balancePresets.ts`:

- `baseline` — default shipping values.
- `generous_onboarding` — higher refill, cheaper upgrades.
- `high_risk_slash` — denser hazards, more injuries.
- `progression_friendly` — faster upgrades, richer match payouts.
- `conservative_economy` — slower refill, stricter rewards.

For each preset, run a 30-minute scripted session and capture the values
below. Aim for the targets in `KPI_TARGETS.md`.

## Per-preset checklist

```
Preset:                 ____________________
Date / build:           ____________________

Slash
  - runs played:        __
  - avg score:          __
  - avg coins/run:      __
  - avg shards/run:     __
  - injuries/10 runs:   __
  - peak combo seen:    __

Squad
  - players unlocked:   __
  - players upgraded:   __
  - players at ceiling: __ / __
  - team OVR start→end: __ → __

Match
  - matches played:     __
  - win rate:           __ %
  - avg coins / match:  __

Notes (frustration moments, dead time, runaway spending, etc.):

Recommended tuning deltas:
```

## Sign-off
A preset is "balance ready" when it hits target ranges across two
independent reviewers and at least one external alpha tester session.
