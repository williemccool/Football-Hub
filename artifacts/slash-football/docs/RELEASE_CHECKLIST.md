# Slash Football — Release Checklist

Use this list before promoting a build to alpha / beta / production.

## Build configuration
- [ ] `app.json` version bumped (`expo.version`)
- [ ] iOS `buildNumber` bumped (set under `ios.buildNumber` when building EAS)
- [ ] Android `versionCode` bumped (set under `android.versionCode` when building EAS)
- [ ] Production `EXPO_PUBLIC_API_URL` configured for the chosen environment
- [ ] App icon (`assets/images/icon.png`) replaces the placeholder
- [ ] Splash image and `splash.backgroundColor` match the in-app SplashGate (#0A0E1A recommended for production)

## Smoke tests
Run the steps in `SMOKE_TESTS.md` on a real device for both iOS and Android.

## Backend / sync
- [ ] `EXPO_PUBLIC_API_URL` reachable from the device under test
- [ ] Sync screen (`/debug`) shows `Backend: Configured` and `Status: online`
- [ ] First-launch on a fresh device creates a guest user and pulls/pushes successfully
- [ ] Migrating from a previous local-only build preserves coins, players, season, and replay payloads

## Analytics & error logging
- [ ] `app_open` fires once per cold launch
- [ ] `slash_run_started` / `slash_run_completed` / `slash_run_score` fire on a slash run
- [ ] `match_started` / `match_completed` fire on a fixture
- [ ] `migration_succeeded` fires for users upgrading from the legacy local-only build
- [ ] Error logs visible in `/debug` after forcing a sync failure

## UX gates
- [ ] Onboarding flow shows on first launch and is skippable
- [ ] Settings screen reachable from Hub gear icon
- [ ] Privacy / Terms / Support links open
- [ ] Reset progress confirms before wiping

## Performance
- [ ] Cold start under 3s on mid-range Android (Pixel 6a class)
- [ ] Slash arena holds 60fps on the same hardware
- [ ] Squad list scrolls smoothly with 25 players
- [ ] No memory growth over 10 consecutive slash runs

## Store metadata
- [ ] Screenshots updated (5.5", 6.5" iPhone; tablet not required — iOS `supportsTablet: false`)
- [ ] App description / keywords approved
- [ ] Age rating set (no gambling, no real-money purchases yet)
- [ ] Support URL set to the live support endpoint
- [ ] Privacy policy URL set to the live policy
- [ ] Release notes drafted (see `docs/templates/release_notes_template.md`)

## Final
- [ ] Tag the release in git (`vX.Y.Z`)
- [ ] Submit build via EAS submit
