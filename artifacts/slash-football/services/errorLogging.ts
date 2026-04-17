import type { ErrorLoggingService } from "./types";

class ConsoleErrorLogger implements ErrorLoggingService {
  capture(err: unknown, context?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.warn("[error]", err, context ?? {});
  }
}

export const errorLogging: ErrorLoggingService = new ConsoleErrorLogger();
