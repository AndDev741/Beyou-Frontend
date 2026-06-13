/**
 * Dev-gated logger.
 * log/warn are suppressed in production builds (tree-shaken via Vite's import.meta.env.DEV).
 * error is always emitted — production errors are legitimate for monitoring/debugging.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
