# Economy & fairness review

Last reviewed alongside the v1 / beta-readiness pass. Re-run before each
production release and at every "Live ops" reboot of presets.

## What we are protecting
1. Slash → upgrade → squad → match → season is the heart of the game.
   All review questions return to: does this regress that loop?
2. Monetization is cosmetics-first. Power must remain earned.

## Slash rewards
- Average coin yield per run on `baseline`: **35–65 coins** (target
  band). Below 35 = stingy, above 65 = inflationary.
- Average shards per run: 1.5–3.0. Above 3 over a sustained sample
  trivialises mid-tier progression.
- Catalysts and trait fragments remain rare drops; review hazard
  density before raising drop chance to compensate for a stingy run.

## Hazards
- Injuries per 10 runs: 0.4–1.0. Above 1.0 is felt as unfair; below 0.4
  removes meaningful tension.
- The injury shield (`injuryShield`) has to be reachable through normal
  physio play; do not gate it on premium currency.
- Burnouts cost manager XP only; never ship a variant that costs gems.

## Salvage choices
- Coins (default): ~140 % base coin value, low essence.
- Essence: ~40 % base coin, ~220 % base essence.
- Evolution: ~50 % base coin, shards into a same-role candidate, 25 %
  catalyst chance.
  → All three should remain situationally optimal. If one dominates
  (e.g. coins is correct >80 % of the time), retune.

## Upgrades
- Upgrade cost curve is `50 + (rating - 60) * 12` coins per +1 rating.
- A new alpha tester reaching team OVR > 78 in their first session is
  a red flag — likely too fast. Target trajectory: OVR ~75 by session 3,
  ~80 by session 8.
- Players at ceiling at D7 should be ≤ 25 % of the squad.

## Match payouts
- Win coin reward: 200–400 (current `matchCoinWin`).
- Draw: 80–150.
- Loss: 0 with morale hit.
- Season champion reward: 5 000–8 000 coins (current
  `seasonChampionReward`). Above 10 000 begins to compress upgrade
  pacing.

## Cosmetic monetization (must not leak into power)
- Catalog audit: every gem-priced item is in `kit | crest | pitch |
  celebration | uiTheme | banner`.
- Pass premium track: ≥ 60 % cosmetic by reward count.
- Pass premium currency rewards do not exceed the matched free track
  for the same elapsed XP — verified by `applyGenerosity` cap.
- Bundles list real savings (≥ 15 %) vs sum of contained items.

## Recommendations from this pass
1. Hold `baseline` preset for the first beta wave; introduce
   `progression_friendly` only as an A/B for new installs.
2. Watch coin-balance drift weekly — flat ±15 % is healthy.
3. If sentiment on `slash_run_completed` drops below 3.5/5 for two
   consecutive days, switch `slash_hazard_intensity` to `low` while
   investigating.
4. Cosmetic preview-to-equip conversion should be > 25 % once gem
   purchase is enabled; below 10 % suggests pricing is off.
5. Re-audit any new catalog item against the "fairness invariants" list
   in `MONETIZATION_READINESS.md` before merging.
