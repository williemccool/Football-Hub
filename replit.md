# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own
dependencies. Currently hosts the **Slash Football** mobile game (Expo) and a
portable, vendor-neutral REST API server that backs it.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Mobile**: Expo + React Native (`artifacts/slash-football`)
- **Build**: esbuild (CJS bundle)

## Artifacts

- `artifacts/api-server` — portable REST backend. **No Replit-specific SDKs in
  the gameplay path.** Only depends on Express + abstract `Database` and
  `ObjectStorage` interfaces (in-memory adapter shipped; swap with Postgres /
  S3 / etc. by writing a new adapter).
  Routes:
  - `POST /api/v1/users` — create anonymous user, returns `{id}`
  - `GET  /api/v1/state/:userId` — pull canonical state
  - `PUT  /api/v1/state/:userId` — push state with `baseVersion` for
    server-authoritative conflict resolution (returns `409` on mismatch)
  - `PUT/GET/DELETE /api/v1/replays/:key` — replay payload object storage
- `artifacts/slash-football` — Expo mobile app. NATIVE only.
- `artifacts/mockup-sandbox` — Vite preview sandbox for canvas mockups.

## Slash Football architecture

All persistence goes through a vendor-neutral `services/` layer:

- `services/auth.ts` — anonymous user id, AsyncStorage cached
- `services/database.ts` — REST adapter for the canonical state
- `services/objectStorage.ts` — hybrid local + REST replay storage
- `services/sync.ts` — orchestrates load / push / migrate / retry queue
- `services/cache.ts` — AsyncStorage helper
- `services/haptics.ts` — wrapper around expo-haptics with throttling and a
  user pref toggle
- `services/analytics.ts` — portable wrapper. Persists a 50-event ring buffer
  with `platform`, `appVersion`, `sessionCount` baseline props. Wired into
  GameContext (slash run, player upgrade, trait, lineup, tactics, match,
  daily objective, season), sync (migration, sync_failed, offline_mode_used),
  and screens (app_open, league_table_viewed, shop_viewed, settings_viewed,
  onboarding_*). Swap the binding for PostHog/Amplitude.
- `services/errorLogging.ts` — portable wrapper with sensitive-key scrubbing
  and a 30-error ring buffer. Swap the binding for Sentry/Bugsnag.
- `services/remote.ts` — REST transport. Reads `EXPO_PUBLIC_API_URL`. When
  unset, the app runs **local-only** with AsyncStorage; sync queues a push for
  whenever a backend is configured. This keeps the architecture portable.

Storage keys (AsyncStorage): `slashfootball.canonical.v1`,
`slashfootball.syncMeta.v1`, `slashfootball.userId.v1`,
`slashfootball.pendingPush.v1`, `slashfootball.replayIndex.v1`,
`slashfootball.replay.<key>`, `slashfootball.salvagePref.v1`,
`slashfootball.hapticsEnabled.v1`, `slashfootball.account.v1`,
`slashfootball.onboardingCompleted.v1`, `slashfootball.analytics.session.v1`,
`slashfootball.analytics.buffer.v1`, `slashfootball.errorLog.buffer.v1`.
Legacy migration source is `slashfootball.state.v2`.

UI surface added on top of core gameplay:

- `components/SplashGate.tsx` — animated splash + sync status overlay
- `components/SalvagePicker.tsx` — coins / essence / evolution salvage modal
  with "remember my choice" preference
- `app/shop.tsx` — cosmetics preview (kits / crests / pitch / FX) — no
  monetization yet
- `app/debug.tsx` — sync inspector (status, version, pending pushes, etc.)
- `app/admin.tsx` — hidden tuning, accessed by tapping the club crest 5×
- `app/settings.tsx` — preferences (haptics), account info, sync status,
  privacy/terms/support links, version, reset progress (confirmed)
- `app/onboarding.tsx` — five-step first-time user flow with skip; gated
  by `slashfootball.onboardingCompleted.v1` and triggered from the Hub

## v1 release docs

`artifacts/slash-football/docs/`:
- `ARCHITECTURE.md` — workspace layout, service contracts, sync flow
- `ENVIRONMENT.md` — env vars for client + server
- `RELEASE_CHECKLIST.md` — pre-flight checklist for alpha / beta / prod
- `SMOKE_TESTS.md` — 12-section device QA checklist
- `templates/release_notes_template.md` — changelog template

## Account / identity layer

`services/auth.ts` exports `AccountInfo` and exposes `getOrCreateUserId`,
`getAccount`, `linkEmail`, `linkProvider`, `clear`. Default impl is a
guest account; the `linkEmail`/`linkProvider` stubs flip the account kind
locally so the upgrade UI can be written today and wired to a real backend
endpoint later without changing call sites.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/slash-football run dev` — run the mobile app

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and
package details.
