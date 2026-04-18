# Slash Football — Architecture Overview

## Goals
- Mobile-first football management + arcade scouting
- Vendor-neutral — no Replit-specific or single-vendor lock-in inside gameplay
- Backend is the source of truth; local cache is offline fallback
- Portable enough to swap backend, hosting, CI, and editor without rewriting business logic

## Workspace layout

```
artifacts/
  slash-football/      Expo / React Native client
  api-server/          Express REST backend (vendor-neutral)
lib/
  api-spec/            OpenAPI / shared types
  api-client-react/    Generated client used by the app
  api-zod/             Zod schemas
  db/                  Drizzle schema (Postgres-ready) + adapters
```

## Client (`artifacts/slash-football`)

```
app/                   expo-router screens
  (tabs)/              Hub, Squad, League, Fixtures, Club
  scout.tsx            Slash arena
  match.tsx            Match playback
  player/[id].tsx      Player detail + upgrade / trait / lineup
  lineup.tsx           Lineup picker
  tactics.tsx          Tactics editor
  shop.tsx             Cosmetics placeholder
  settings.tsx         Preferences, account, support
  onboarding.tsx       First-time user flow
  debug.tsx            Sync + diagnostics
  admin.tsx            Live-ops tuning (hidden — tap club crest 5x)

components/            Reusable UI (PlayerCard, SplashGate, SalvagePicker, …)
context/GameContext    Authoritative in-memory game state + actions
lib/                   Pure logic (league, matchSim, seedData, types)
services/              Vendor-neutral service wrappers (see below)
```

### Service layer (`services/`)
All gameplay code depends only on these abstractions:

| Service        | Default impl              | Purpose                                              |
|----------------|---------------------------|------------------------------------------------------|
| `auth`         | AnonymousAuth             | Stable guest user id, future email/social linking    |
| `database`     | RestDatabase / InMemory   | `pullState` / `pushState` with optimistic versioning |
| `objectStorage`| RestObjectStorage / Local | Replay payloads, future cosmetic & media assets      |
| `cache`        | AsyncStorage              | Offline fallback + meta                              |
| `analytics`    | PortableAnalytics         | Event ring buffer, swap for PostHog/Amplitude        |
| `errorLogging` | PortableErrorLogger       | Scrubbed error ring buffer, swap for Sentry/Bugsnag  |
| `haptics`      | expo-haptics wrapper      | Throttled, tier-aware feedback                       |
| `sync`         | SyncService               | Orchestrates pull / push / migration / conflict      |

To migrate vendors, replace the concrete adapter and keep the interface.

### State + sync flow
1. `_layout.tsx` mounts `GameProvider`.
2. `GameProvider` calls `sync.loadInitial()`:
   - try remote `database.pullState` (canonical)
   - else local cache (`slashfootball.canonical.v1`)
   - else legacy state (`slashfootball.state.v2`) → migrate + push
   - else fresh user
3. Every state change triggers `sync.push(state)` — debounced 1.5s, queued for retry.
4. 409 conflicts are resolved server-wins; the new server state is surfaced via `SyncSnapshot.serverState`.
5. Match replays are stored separately via `objectStorage.putReplay`.

## Server (`artifacts/api-server`)
- Express + Zod-validated routes
- `services/database.ts` exposes a `Database` interface; default `InMemoryDatabase` is swappable for Postgres via Drizzle (`lib/db`)
- `services/objectStorage.ts` exposes an `ObjectStorage` interface; default in-memory implementation is swappable for S3/R2/GCS

## Portability rules
- No Replit SDKs imported in `services/`, `lib/`, or `context/`
- Backend URL is read from `EXPO_PUBLIC_API_URL`; missing → local-only mode (no crashes)
- All persisted keys carry an explicit version suffix (`.v1`, `.v2`)
- Database calls are version-checked (optimistic concurrency control)
