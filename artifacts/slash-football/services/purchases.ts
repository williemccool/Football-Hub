import { PURCHASES_OWNED_KEY } from "@/constants/storageKeys";

import { analytics } from "./analytics";
import { cache } from "./cache";

/**
 * Portable purchase service. The game NEVER calls a vendor SDK directly:
 * it talks to this service, which delegates to a registered adapter.
 *
 * Two adapters ship by default:
 *   - "placeholder" (default in dev/alpha/beta): every purchase succeeds
 *     locally with no money movement. Used to exercise the entitlement /
 *     restore plumbing end-to-end before app-store activation.
 *   - "store" (production): a stub interface meant to be implemented later
 *     by an Apple StoreKit / Google Play Billing module. Until that module
 *     exists, this falls through to placeholder so the app never crashes.
 *
 * Entitlement bookkeeping is local-first (cache-backed). When real billing
 * is wired up, the adapter is responsible for calling `grantEntitlement`
 * on a verified receipt; the rest of the app reads from the same source.
 */

export type PurchaseProductId =
  | `gems_${string}`
  | `bundle_${string}`
  | `pass_premium_${string}`
  | `founder_${string}`
  | `starter_${string}`;

export type PurchaseStatus =
  | "idle"
  | "pending"
  | "success"
  | "cancelled"
  | "failed"
  | "already_owned";

export interface PurchaseResult {
  status: PurchaseStatus;
  productId: PurchaseProductId;
  /** Vendor receipt or local pseudo-receipt. */
  receipt: string | null;
  /** Human-readable error if `failed`. */
  error?: string;
}

export interface PurchaseAdapter {
  readonly name: "placeholder" | "store";
  /** Called once at boot. Should resolve when the billing layer is ready. */
  init(): Promise<void>;
  /** Charge for a product. Adapter is responsible for cancellation UX. */
  buy(productId: PurchaseProductId): Promise<PurchaseResult>;
  /** Restore previously-owned non-consumables (cosmetics, pass, etc). */
  restore(): Promise<PurchaseProductId[]>;
}

interface OwnedMap {
  [productId: string]: { ownedAt: number; receipt: string | null };
}

type StatusListener = (s: { productId: PurchaseProductId; status: PurchaseStatus; error?: string }) => void;

class PlaceholderAdapter implements PurchaseAdapter {
  readonly name = "placeholder" as const;
  async init(): Promise<void> {}
  async buy(productId: PurchaseProductId): Promise<PurchaseResult> {
    return {
      status: "success",
      productId,
      receipt: `placeholder:${productId}:${Date.now()}`,
    };
  }
  async restore(): Promise<PurchaseProductId[]> {
    // The placeholder adapter has no off-device record — entitlements are
    // already cached locally and re-applied on boot. This returns nothing
    // so the UI can still show "Nothing to restore" cleanly.
    return [];
  }
}

/**
 * Consumables are billed every time and never tracked as "owned" — restoring
 * does not re-grant them. Anything else is a non-consumable entitlement
 * (cosmetic / pass / pack) that we cache and re-grant on restore.
 */
export function isConsumable(productId: PurchaseProductId): boolean {
  return productId.startsWith("gems_");
}

class PurchaseService {
  private adapter: PurchaseAdapter = new PlaceholderAdapter();
  private owned: OwnedMap = {};
  private ready: Promise<void>;
  private adapterReady: Promise<void> = Promise.resolve();
  private listeners = new Set<StatusListener>();

  constructor() {
    this.adapterReady = this.adapter.init();
    this.ready = (async () => {
      this.owned = (await cache.read<OwnedMap>(PURCHASES_OWNED_KEY)) ?? {};
      await this.adapterReady;
    })();
  }

  /** Swap in a real StoreKit/Play Billing adapter at app boot. */
  setAdapter(adapter: PurchaseAdapter): void {
    this.adapter = adapter;
    // Re-chain `ready` so any in-flight buy()/restore() awaits the new
    // adapter's init before talking to it.
    this.adapterReady = adapter.init();
    this.ready = this.ready.then(() => this.adapterReady);
  }

  adapterName(): "placeholder" | "store" {
    return this.adapter.name;
  }

  subscribe(fn: StatusListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(productId: PurchaseProductId, status: PurchaseStatus, error?: string): void {
    for (const fn of this.listeners) fn({ productId, status, error });
  }

  isOwned(productId: PurchaseProductId): boolean {
    return !!this.owned[productId];
  }

  ownedList(): PurchaseProductId[] {
    return Object.keys(this.owned) as PurchaseProductId[];
  }

  async grantEntitlement(productId: PurchaseProductId, receipt: string | null): Promise<void> {
    await this.ready;
    // Never cache consumables: they are billed each time and have no
    // restore semantics.
    if (isConsumable(productId)) return;
    if (this.owned[productId]) return;
    this.owned[productId] = { ownedAt: Date.now(), receipt };
    await cache.write(PURCHASES_OWNED_KEY, this.owned);
  }

  /**
   * Buy a product. Reports lifecycle through analytics + listeners so any
   * UI can show pending/success/failure without owning the flow itself.
   */
  async buy(productId: PurchaseProductId): Promise<PurchaseResult> {
    await this.ready;
    if (!isConsumable(productId) && this.owned[productId]) {
      this.emit(productId, "already_owned");
      analytics.track("purchase_attempted", {
        productId,
        adapter: this.adapter.name,
        outcome: "already_owned",
      });
      return { status: "already_owned", productId, receipt: this.owned[productId]!.receipt };
    }
    this.emit(productId, "pending");
    analytics.track("purchase_attempted", {
      productId,
      adapter: this.adapter.name,
      outcome: "pending",
    });
    let res: PurchaseResult;
    try {
      res = await this.adapter.buy(productId);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.emit(productId, "failed", err);
      analytics.track("purchase_failed", { productId, adapter: this.adapter.name, error: err });
      return { status: "failed", productId, receipt: null, error: err };
    }
    if (res.status === "success") {
      await this.grantEntitlement(productId, res.receipt);
      this.emit(productId, "success");
      analytics.track("purchase_succeeded", { productId, adapter: this.adapter.name });
    } else {
      this.emit(productId, res.status, res.error);
      analytics.track("purchase_failed", {
        productId,
        adapter: this.adapter.name,
        error: res.error ?? res.status,
      });
    }
    return res;
  }

  /**
   * Restore non-consumable entitlements. Returns the count restored so UX
   * can show "Restored N items" / "Nothing to restore" without inspecting
   * the raw list.
   */
  async restore(): Promise<{ restored: number; productIds: PurchaseProductId[] }> {
    await this.ready;
    let restored: PurchaseProductId[] = [];
    try {
      restored = await this.adapter.restore();
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      analytics.track("purchases_restore_failed", { adapter: this.adapter.name, error: err });
      throw e;
    }
    let added = 0;
    for (const id of restored) {
      if (isConsumable(id)) continue; // consumables never restore
      if (!this.owned[id]) added += 1;
      await this.grantEntitlement(id, `restored:${id}`);
    }
    analytics.track("purchases_restored", {
      adapter: this.adapter.name,
      restored: added,
      total: restored.length,
    });
    return { restored: added, productIds: restored };
  }

  /** Test / reset hook: drop local entitlement bookkeeping. */
  async clearAll(): Promise<void> {
    await this.ready;
    this.owned = {};
    await cache.remove(PURCHASES_OWNED_KEY);
  }
}

export const purchases = new PurchaseService();
