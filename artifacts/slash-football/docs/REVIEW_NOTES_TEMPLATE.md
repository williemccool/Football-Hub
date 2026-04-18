# Review notes template (Apple + Google)

Use one filled-out copy per submission. Keep it short.

---

**App:** Slash Football
**Version:** &lt;version&gt; (&lt;build&gt;)
**Date:** &lt;YYYY-MM-DD&gt;
**Submitter:** &lt;name&gt;

## What's new in this build
- &lt;1–3 bullets, user-facing&gt;

## How to use the app
1. Launch the app. The 5-step onboarding starts automatically — tap
   "Next" through to "Start playing".
2. From the hub, tap the slash arena ("Scout") to play a 30-second
   slash run. Slash glowing footballs; avoid red hazards. Rewards apply
   automatically.
3. Tap "Squad" to upgrade players with earned coins / shards.
4. Tap "Fixtures" → "Play match" to play the next league match.
5. Tap "League" to see the table. Tap "Cosmetics" (when enabled) to
   browse kits, crests, pitch themes, celebrations.

## Demo account
Not required — there is no login at v1. Progress is local + synced to a
device-anonymous backend identifier.

## In-app purchases
None enabled in this build. The shop and pass screens are visible for
review but contain no real-money products. All pricing is in earned
in-game currency.

## Test focus areas
1. Onboarding completes on first launch.
2. Slash arena starts and ends without crash.
3. A match can be played end-to-end.
4. Cosmetics shop can be opened, an item previewed, and (with sufficient
   in-game currency) equipped.
5. Settings shows build label, sync status, and feedback entry points.

## Known behavior notes
- The app is fully playable offline. Sync resumes automatically when
  connectivity returns.
- Slash hazards may briefly shake the device on collision (haptics).
- Animations honour the system "Reduce Motion" setting.

## Contact
support@slash-football.example
