import type { AnalyticsService } from "./types";

// No-op analytics. Replace with a real provider (PostHog, Amplitude, etc.)
// without touching gameplay code.
class NoopAnalytics implements AnalyticsService {
  track(_event: string, _props?: Record<string, unknown>) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[analytics]", _event, _props ?? {});
    }
  }
}

export const analytics: AnalyticsService = new NoopAnalytics();
