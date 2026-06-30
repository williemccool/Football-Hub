/**
 * StoreAdapter — production purchase adapter shell for the cosmetics/pass
 * launch path.
 *
 * This is a vendor-neutral skeleton. It implements the {@link PurchaseAdapter}
 * contract from `services/purchases.ts` and exposes a single seam
 * (`setBillingBackend`) where a real Apple StoreKit / Google Play Billing
 * native module can plug in later. Until that module is wired, every call
 * falls back to the existing placeholder behaviour so we never crash and
 * never accidentally charge a user.
 *
 * Why a shell and not a direct integration?
 * - The Expo runtime in this repo does not yet ship the billing native
 *   module, and we want to keep the codebase portable and vendor-neutral
 *   per the project's stated constraint.
 * - The shell lets every screen (`shop`, `pass`, `settings`) talk to the
 *   real `purchases` service today; flipping to real billing later only
 *   requires `purchases.setAdapter(makeStoreAdapter(realBackend))`.
 *
 * Wiring a real backend (later, when ready):
 *
 *   import * as InAppPurchases from "expo-in-app-purchases";
 *   storeAdapter.setBillingBackend({
 *     async init() { await InAppPurchases.connectAsync(); },
 *     async purchase(productId) {
 *       await InAppPurchases.purchaseItemAsync(productId);
 *       // ... resolve via purchase listener
 *     },
 *     async restore() {
 *       const { results } = await InAppPurchases.getPurchaseHistoryAsync();
 *       return (results ?? []).map((p) => p.productId);
 *     },
 *   });
 *   purchases.setAdapter(storeAdapter);
 */

import { Platform } from "react-native";

import type {
  PurchaseAdapter,
  PurchaseProductId,
  PurchaseResult,
} from "./purchases";

/**
 * Minimal contract a real native billing module must satisfy. Keep this
 * surface tiny so we can plug Apple StoreKit, Google Play Billing, RevenueCat,
 * Adapty, or a future Expo IAP module without touching gameplay code.
 */
export interface BillingBackend {
  /** Connect to the store. Throw on hard failure. */
  init(): Promise<void>;
  /**
   * Start a purchase flow. Resolve with a final lifecycle event:
   *   - { ok: true, receipt } on a charged, verified purchase
   *   - { ok: false, reason: "cancelled" } if the user backed out
   *   - { ok: false, reason: "failed", error } on any other terminal error
   */
  purchase(productId: PurchaseProductId): Promise<BillingPurchaseResult>;
  /** Return product ids the user already owns (non-consumables only). */
  restore(): Promise<PurchaseProductId[]>;
}

export type BillingPurchaseResult =
  | { ok: true; receipt: string }
  | { ok: false; reason: "cancelled" }
  | { ok: false; reason: "failed"; error: string };

class StoreAdapter implements PurchaseAdapter {
  readonly name = "store" as const;
  private backend: BillingBackend | null = null;
  private initialized = false;

  /**
   * Inject the real native billing module. Safe to call zero or one time
   * during app boot. Calling it again replaces the previous backend.
   */
  setBillingBackend(backend: BillingBackend | null): void {
    this.backend = backend;
    this.initialized = false;
  }

  hasBillingBackend(): boolean {
    return this.backend !== null;
  }

  async init(): Promise<void> {
    if (!this.backend) return;
    if (this.initialized) return;
    try {
      await this.backend.init();
      this.initialized = true;
    } catch (e) {
      // Don't crash the app — fall back to placeholder behaviour. The
      // PurchaseService already surfaces the error via the lifecycle
      // listener, and the user can retry from the shop UI.
      this.initialized = false;
      throw e;
    }
  }

  async buy(productId: PurchaseProductId): Promise<PurchaseResult> {
    if (!this.backend) {
      // No native module wired yet → behave like the placeholder so the
      // game UX is never broken in dev / TestFlight builds without IAP.
      return {
        status: "success",
        productId,
        receipt: `placeholder-store:${productId}:${Date.now()}`,
      };
    }
    try {
      if (!this.initialized) await this.init();
      const r = await this.backend.purchase(productId);
      if (r.ok) {
        return { status: "success", productId, receipt: r.receipt };
      }
      if (r.reason === "cancelled") {
        return { status: "cancelled", productId, receipt: null };
      }
      return {
        status: "failed",
        productId,
        receipt: null,
        error: r.error,
      };
    } catch (e) {
      return {
        status: "failed",
        productId,
        receipt: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async restore(): Promise<PurchaseProductId[]> {
    if (!this.backend) return [];
    try {
      if (!this.initialized) await this.init();
      return await this.backend.restore();
    } catch {
      // Restore should never throw to the UI; the PurchaseService converts
      // an empty list into "Nothing to restore".
      return [];
    }
  }

  /**
   * Best-effort capability check. Real billing only makes sense on iOS /
   * Android device builds; on web / simulator we should leave the
   * placeholder adapter in place so dev iteration stays painless.
   */
  static isLikelySupportedPlatform(): boolean {
    return Platform.OS === "ios" || Platform.OS === "android";
  }
}

export const storeAdapter = new StoreAdapter();
export type { StoreAdapter };
