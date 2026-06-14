export interface Logger {
  error(...args: unknown[]): void;
}

// Default routes to console (preserves today's behavior). The host app can
// override via setLogger() to route to its own logger / Sentry / etc.
let logger: Logger = { error: (...args) => console.error(...args) };

export function setLogger(l: Logger): void { logger = l; }
export function getLogger(): Logger { return logger; }
