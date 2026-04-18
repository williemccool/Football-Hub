# Purchase Architecture

The app uses a **portable purchase service** so monetization can ship
without coupling business logic to any single billing vendor. The same
codepath drives placeholder testing today and real StoreKit / Play
Billing on launch day.

## Layers

```
UI (shop / pass / settings)
     │
     ▼
GameContext (cosmetics-first business rules)   <- soft currency only
     │
     ▼
purchases service (services/purchases.ts)      <- product / entitlement
     │
     ▼
PurchaseAdapter (placeholder | store)          <- vendor SDK boundary
```

- **UI never imports a vendor SDK.** It calls `purchases.buy(productId)`
  and reacts to `purchases.subscribe(...)` events.
- **GameContext only deals with soft currency** (coins, gems) and
  cosmetic ownership. It never sees a billing receipt.
- **The purchase service** owns the entitlement cache, the lifecycle
  events, and the analytics emissions.
- **The adapter** wraps whichever vendor SDK we ship. Today this is
  `PlaceholderAdapter` (auto-success, no money). Tomorrow this is a
  StoreKit or Play Billing implementation.

## Product IDs

`PurchaseProductId` is a string-template type:

```
gems_<sku>          // consumable gem packs
bundle_<sku>        // non-consumable cosmetic bundles
pass_premium_<sku>  // premium season pass
founder_<sku>       // founder pack
starter_<sku>       // one-time starter pack
```

Conventions:

- `gems_*` are **consumables** — the adapter must let the user buy
  them again. The service does not record ownership for these.
- All other prefixes are **non-consumable** entitlements. The service
  records `{ ownedAt, receipt }` in cache (`PURCHASES_OWNED_KEY`) and
  the restore flow re-grants them.

## Lifecycle events

```ts
purchases.subscribe(({ productId, status, error }) => { ... });
```

Emitted statuses:

- `pending` — adapter has been called, awaiting result.
- `success` — entitlement granted; cache updated.
- `cancelled` — user dismissed the vendor sheet.
- `failed` — vendor returned an error (see `error`).
- `already_owned` — non-consumable entitlement already cached.

Analytics events emitted automatically:

- `purchase_attempted` `{ productId, adapter, outcome }`
- `purchase_succeeded` `{ productId, adapter }`
- `purchase_failed` `{ productId, adapter, error }`
- `purchases_restored` `{ adapter, restored, total }`
- `purchases_restore_failed` `{ adapter, error }`

## Restore flow

```ts
const r = await purchases.restore();
// r.restored = how many newly-granted entitlements
// r.productIds = the full list returned by the vendor
```

Surfaces:

- **Settings → Purchases → Restore purchases** (primary CTA).
- **Shop header** has a refresh icon that triggers the same flow.

The placeholder adapter returns `[]`, so users without a real billing
adapter still get the "Nothing to restore" reassurance text.

## Swapping in a real adapter

Implement `PurchaseAdapter` and call `purchases.setAdapter(...)` at
boot **before** the first UI mount. The interface:

```ts
interface PurchaseAdapter {
  readonly name: "placeholder" | "store";
  init(): Promise<void>;
  buy(productId: PurchaseProductId): Promise<PurchaseResult>;
  restore(): Promise<PurchaseProductId[]>;
}
```

Rules for the `store` adapter:

- Verify receipts before resolving `success`.
- Handle cancellation as `{ status: "cancelled", receipt: null }`,
  not as a thrown error.
- Use the vendor's idempotency primitives — never grant the same
  non-consumable twice.
- For consumables (`gems_*`), call `purchases.grantEntitlement` only
  to keep the audit trail; the actual gem balance update happens via
  `addGems` in `GameContext`.

## Test paths (placeholder adapter)

| Action | Expected |
|--------|----------|
| Buy non-consumable, then buy again | First success, second `already_owned` |
| Restore on a fresh device with cache cleared | "Nothing to restore" alert |
| Purchase fails (wrap adapter to throw) | `purchase_failed` analytics; UI alert "Restore failed" / "Try again later" |
| Sign-out flow (`reset()`) | Cosmetics + entitlement cache cleared; restore re-grants nothing |

## What this architecture protects

- **No vendor lock-in.** Replacing the adapter is one file.
- **Single source of truth for ownership.** Every "do I own X?" check
  reads from `lib/entitlements.ts` and ultimately from the same cache.
- **Fairness.** The purchase layer cannot grant gameplay power — only
  cosmetic / pass / pack entitlements — because `GameContext` is the
  only path that mutates progression.
