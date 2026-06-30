/**
 * PushAdapter — production push-delivery shell.
 *
 * Subscribes to the portable {@link notifications} service so any payload
 * the game would surface in-app can also be dispatched as a real OS push
 * via a pluggable {@link PushBackend} (APNs / FCM / OneSignal / Expo Push).
 *
 * Like {@link storeAdapter}, this is a vendor-neutral shell. The default
 * behaviour is "no native module wired" → log + no-op, so the game keeps
 * working in dev / web without push capability.
 *
 * Wiring a real backend (later, when ready):
 *
 *   import * as Notifications from "expo-notifications";
 *   pushAdapter.setBackend({
 *     async requestPermissions() {
 *       const { status } = await Notifications.requestPermissionsAsync();
 *       return status === "granted" ? "granted" : "denied";
 *     },
 *     async getDeviceToken() {
 *       const t = await Notifications.getDevicePushTokenAsync();
 *       return t.data;
 *     },
 *     async deliver(payload) {
 *       await Notifications.scheduleNotificationAsync({
 *         content: { title: payload.title, body: payload.body, data: payload },
 *         trigger: null,
 *       });
 *     },
 *   });
 *   pushAdapter.start();
 */

import { Platform } from "react-native";

import { errorLogging } from "./errorLogging";
import {
  notifications,
  type NotificationPayload,
} from "./notifications";
import {
  categoryForTrigger,
  notificationPrefs,
} from "./notificationPrefs";

export type PushPermissionStatus = "granted" | "denied" | "undetermined";

export interface PushBackend {
  /** Request OS-level permission to send notifications. */
  requestPermissions(): Promise<PushPermissionStatus>;
  /** Current permission state without prompting. */
  getPermissionStatus?(): Promise<PushPermissionStatus>;
  /** Stable device token for server-side targeting. Optional. */
  getDeviceToken?(): Promise<string | null>;
  /** Deliver a single payload as a real OS notification. */
  deliver(payload: NotificationPayload): Promise<void>;
}

class PushAdapter {
  private backend: PushBackend | null = null;
  private unsubscribe: (() => void) | null = null;
  private permission: PushPermissionStatus = "undetermined";
  private deviceToken: string | null = null;

  setBackend(backend: PushBackend | null): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.backend = backend;
    this.permission = "undetermined";
    this.deviceToken = null;
  }

  hasBackend(): boolean {
    return this.backend !== null;
  }

  /**
   * Begin forwarding outgoing notifications to the OS. Call this once at
   * app boot (typically right after `setBackend`). Safe to call multiple
   * times — duplicate subscriptions are dropped.
   */
  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = notifications.subscribeOutgoing((payload) => {
      this.dispatch(payload).catch((e) => {
        errorLogging.capture(e, { phase: "push.dispatch" });
      });
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async requestPermissions(): Promise<PushPermissionStatus> {
    if (!this.backend) return "undetermined";
    try {
      this.permission = await this.backend.requestPermissions();
      return this.permission;
    } catch (e) {
      errorLogging.capture(e, { phase: "push.requestPermissions" });
      return "denied";
    }
  }

  async refreshPermissions(): Promise<PushPermissionStatus> {
    if (!this.backend?.getPermissionStatus) return this.permission;
    try {
      this.permission = await this.backend.getPermissionStatus();
    } catch {
      // ignore — keep the last known value
    }
    return this.permission;
  }

  async refreshDeviceToken(): Promise<string | null> {
    if (!this.backend?.getDeviceToken) return null;
    try {
      this.deviceToken = await this.backend.getDeviceToken();
    } catch (e) {
      errorLogging.capture(e, { phase: "push.getDeviceToken" });
      this.deviceToken = null;
    }
    return this.deviceToken;
  }

  /**
   * Internal dispatcher. Respects user notification preferences AND OS
   * permission. Anything blocked is silently dropped — the in-app reminder
   * surface is still authoritative for that payload.
   */
  private async dispatch(payload: NotificationPayload): Promise<void> {
    if (!this.backend) return;
    if (this.permission !== "granted") return;
    const category = categoryForTrigger(payload.trigger);
    if (!notificationPrefs.isEnabled(category)) return;
    await this.backend.deliver(payload);
  }

  /** Best-effort capability hint — push only works on real iOS/Android. */
  static isLikelySupportedPlatform(): boolean {
    return Platform.OS === "ios" || Platform.OS === "android";
  }
}

export const pushAdapter = new PushAdapter();
export type { PushAdapter };
