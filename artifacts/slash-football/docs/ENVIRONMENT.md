# Environment Configuration

## Expo client (`artifacts/slash-football`)

| Variable              | Required | Description                                              |
|-----------------------|----------|----------------------------------------------------------|
| `EXPO_PUBLIC_API_URL` | optional | REST backend root, e.g. `https://api.example.com`. When unset, the app runs in local-only mode and queues a push for whenever a backend appears. |
| `PORT`                | dev only | Metro / Expo dev server port (overridden by the dev workflow). |
| `EXPO_PACKAGER_PROXY_URL` | dev only | Public origin used by the Replit proxy iframe. The dev script respects an external override. |

## API server (`artifacts/api-server`)

| Variable      | Required | Default        | Description                                |
|---------------|----------|----------------|--------------------------------------------|
| `PORT`        | yes      | `3000`         | HTTP port                                  |
| `DATABASE_URL`| optional | (in-memory)    | Postgres URL; if set, swap to Drizzle adapter |
| `STORAGE_BUCKET` | optional | (in-memory) | Object storage backing for replay payloads |

## Local development
```
pnpm install
pnpm --filter @workspace/api-server run dev    # backend on :3000
pnpm --filter @workspace/slash-football run dev # mobile on :21394
```

## Production builds
- iOS / Android: `eas build --profile production`
- Web (optional): not currently a release target

## Secrets
- Do NOT commit `.env*` files
- Use EAS Secrets for production: `eas secret:create EXPO_PUBLIC_API_URL "https://…"`
- Backend secrets belong in your hosting provider's secret manager, not in source control
