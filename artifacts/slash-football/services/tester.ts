import Constants from "expo-constants";
import { Platform } from "react-native";

import { TESTER_PROFILE_KEY } from "@/constants/storageKeys";

import { cache } from "./cache";

/**
 * Portable tester profile. Captures build/environment metadata and tester
 * cohort data used by analytics, feature flags, and feedback. Vendor-neutral:
 * never wired to a single backend or feature-flag SaaS.
 */

export type BuildChannel = "dev" | "alpha" | "beta" | "production";
export type AppEnvironment = "development" | "staging" | "production";

export interface TesterProfile {
  /** Stable random ID for this device install. */
  installId: string;
  installedAt: number;
  /** Cohort tag (e.g. "internal-qa", "wave-1", "wave-2"). */
  cohort: string;
  /** Acquisition / source tag placeholder ("organic", "tester-list-1", …). */
  source: string;
  /** Internal vs external tester. */
  internal: boolean;
  /** Country / region code placeholder. */
  region: string | null;
  /** Optional experiment-group tag (set by feature flags / live-ops). */
  experimentGroup: string | null;
}

interface BuildInfo {
  appVersion: string;
  buildNumber: string;
  buildChannel: BuildChannel;
  environment: AppEnvironment;
  platform: string;
  /** True when running under a debug/dev runtime. */
  isDev: boolean;
  /** Pretty label used in settings/debug views ("Alpha 1.0.0 (42) — staging"). */
  label: string;
}

function readChannel(): BuildChannel {
  const v =
    (process.env.EXPO_PUBLIC_BUILD_CHANNEL as string | undefined) ??
    (Constants.expoConfig?.extra as { buildChannel?: string } | undefined)?.buildChannel;
  if (v === "production" || v === "beta" || v === "alpha" || v === "dev") return v;
  // In dev runtime default to "dev"; otherwise treat as alpha (safest pre-launch default).
  return __DEV__ ? "dev" : "alpha";
}

function readEnvironment(): AppEnvironment {
  const v =
    (process.env.EXPO_PUBLIC_ENV as string | undefined) ??
    (Constants.expoConfig?.extra as { env?: string } | undefined)?.env;
  if (v === "production" || v === "staging" || v === "development") return v;
  return __DEV__ ? "development" : "staging";
}

function readBuildInfo(): BuildInfo {
  const appVersion =
    (Constants.expoConfig?.version as string | undefined) ??
    (Constants.manifest as { version?: string } | null)?.version ??
    "0.0.0";
  const buildNumber =
    (Constants.expoConfig?.ios?.buildNumber as string | undefined) ??
    (Constants.expoConfig?.android?.versionCode != null
      ? String(Constants.expoConfig.android.versionCode)
      : undefined) ??
    "0";
  const channel = readChannel();
  const env = readEnvironment();
  const channelLabel =
    channel === "production"
      ? ""
      : channel.charAt(0).toUpperCase() + channel.slice(1) + " ";
  const label = `${channelLabel}${appVersion} (${buildNumber}) · ${env}`;
  return {
    appVersion,
    buildNumber,
    buildChannel: channel,
    environment: env,
    platform: Platform.OS,
    isDev: __DEV__,
    label,
  };
}

function genInstallId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `inst_${t}_${r}`;
}

function defaultProfile(channel: BuildChannel): TesterProfile {
  return {
    installId: genInstallId(),
    installedAt: Date.now(),
    cohort: channel === "dev" ? "internal-dev" : "alpha-wave-1",
    source: "direct",
    internal: channel === "dev" || channel === "alpha",
    region: null,
    experimentGroup: null,
  };
}

class TesterStore {
  private profile: TesterProfile | null = null;
  private build: BuildInfo = readBuildInfo();
  private listeners = new Set<(p: TesterProfile) => void>();
  private ready: Promise<TesterProfile>;

  constructor() {
    this.ready = (async () => {
      const loaded = await cache.read<TesterProfile>(TESTER_PROFILE_KEY);
      if (loaded && loaded.installId) {
        this.profile = loaded;
      } else {
        const fresh = defaultProfile(this.build.buildChannel);
        await cache.write(TESTER_PROFILE_KEY, fresh);
        this.profile = fresh;
      }
      this.notify();
      return this.profile;
    })();
  }

  getBuild(): BuildInfo {
    return this.build;
  }

  /** Synchronous best-effort getter; returns null until first load resolves. */
  current(): TesterProfile | null {
    return this.profile;
  }

  async get(): Promise<TesterProfile> {
    return this.ready;
  }

  async update(partial: Partial<TesterProfile>): Promise<TesterProfile> {
    const base = await this.ready;
    const next: TesterProfile = { ...base, ...partial, installId: base.installId };
    this.profile = next;
    await cache.write(TESTER_PROFILE_KEY, next);
    this.notify();
    return next;
  }

  subscribe(fn: (p: TesterProfile) => void): () => void {
    this.listeners.add(fn);
    if (this.profile) fn(this.profile);
    return () => this.listeners.delete(fn);
  }

  /** Stable analytics props applied to every event. */
  analyticsBase(): Record<string, unknown> {
    return {
      installId: this.profile?.installId ?? null,
      cohort: this.profile?.cohort ?? null,
      buildChannel: this.build.buildChannel,
      environment: this.build.environment,
      buildNumber: this.build.buildNumber,
      experimentGroup: this.profile?.experimentGroup ?? null,
    };
  }

  private notify() {
    if (!this.profile) return;
    for (const fn of this.listeners) fn(this.profile);
  }
}

export const tester = new TesterStore();
