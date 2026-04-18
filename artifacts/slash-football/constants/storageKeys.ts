/**
 * Centralized AsyncStorage keys. Importing route files from non-route files
 * (or vice versa) can confuse Metro/expo-router; collect cross-cutting
 * constants here so screens and services can share them safely.
 */

export const ONBOARDING_KEY = "slashfootball.onboardingCompleted.v1";
export const TESTER_PROFILE_KEY = "slashfootball.tester.profile.v1";
export const FEATURE_FLAGS_KEY = "slashfootball.featureFlags.v1";
export const FEEDBACK_QUEUE_KEY = "slashfootball.feedback.queue.v1";
export const SENTIMENT_LAST_KEY = "slashfootball.sentiment.lastShown.v1";
export const NOTIFICATIONS_DISMISSED_KEY = "slashfootball.notifications.dismissed.v1";
export const BALANCE_PRESET_KEY = "slashfootball.balance.preset.v1";
