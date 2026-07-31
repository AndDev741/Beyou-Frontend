import { ApiError } from './httpClient';
import type { Logger } from './logger';

/**
 * Which handled API failures are worth an issue in the error collector.
 *
 * Every function in this package catches its own failures and returns
 * `{ success?, error? }` — nothing propagates to `window.onerror` or to a React
 * error boundary. That design is deliberate, but it means a backend outage is
 * "handled" and therefore *invisible*: before this filter existed, the collector
 * only ever saw render crashes.
 *
 * The naive fix — report everything the logger sees — is worse than nothing.
 * `getLogger().error(...)` fires for EVERY axios rejection, so the collector
 * would fill with a validation rejection per bad form submit, a 401 per expired
 * session probe, a 404 per `FEEDBACK_NOT_FOUND`, a 429 per rate limit. Those are
 * the server working correctly, and burying the real 500s under them defeats the
 * "alert on a NEW error" workflow the collector exists for.
 *
 * The rule, stated once so both apps classify identically:
 *
 *   - 4xx → NOT reportable. The request reached the server and the server
 *     rejected it on purpose. If a 4xx is wrong, that is a product bug found
 *     through the UI, not an incident.
 *   - 5xx → reportable. The server accepted the request and then failed.
 *   - status 0 → reportable. Both adapters normalise "no response received" to
 *     0 (DNS failure, connection refused, CORS rejection, TLS failure, or the
 *     mobile client's own abort-on-timeout). Something between the user and the
 *     backend is broken, which is exactly what the collector should surface.
 *   - anything that is not an `ApiError` → reportable. The transport layer
 *     normalises every HTTP outcome into `ApiError`, so a different shape here
 *     means a fault in our own code (a `TypeError` in a mapper, a malformed SSE
 *     frame, a rejected `JSON.parse`) — the most valuable class of all.
 *
 * Lives in `@beyou/api` rather than in each app's telemetry module for two
 * reasons: `ApiError` is this package's own type, so the classifier belongs next
 * to the thing it classifies; and web and mobile MUST agree on the boundary —
 * two copies would drift, and a filter that silently differs per platform makes
 * the collector's numbers unreadable.
 */
export function isReportableFailure(value: unknown): boolean {
    if (value instanceof ApiError) {
        return value.status < 400 || value.status >= 500;
    }
    return true;
}

/**
 * The primary subject of a log call. Call sites are overwhelmingly
 * `getLogger().error(e)`, but a leading label (`error('createHabit failed:', e)`)
 * must not make an expected 4xx look like an unrecognisable fault, so prefer the
 * first `Error` among the arguments.
 */
function primarySubject(args: unknown[]): unknown {
    const firstError = args.find((arg) => arg instanceof Error);
    return firstError ?? args[0];
}

/**
 * Compose the `Logger` an app installs via `setLogger()`.
 *
 * Two legs, deliberately independent:
 *
 *   - `consoleLogger` runs for EVERY call, unconditionally. Losing local console
 *     visibility during development would be a regression, and it must not
 *     depend on whether a DSN happens to be configured.
 *   - `report` runs only for failures `isReportableFailure()` admits.
 *
 * Note this wraps a logger the app passes in rather than the app's own global
 * logger: on web, `ErrorBoundary` calls both `logger.error(...)` AND
 * `reportCaughtError(...)`, so teaching the app-wide logger to report would turn
 * every render crash into two issues. Only the `@beyou/api` seam is reporting.
 *
 * @param consoleLogger the app's existing console-backed logger
 * @param report hands a failure to the app's error-reporting SDK
 */
export function createReportingLogger(consoleLogger: Logger, report: (error: unknown) => void): Logger {
    return {
        error: (...args: unknown[]): void => {
            consoleLogger.error(...args);

            const subject = primarySubject(args);
            if (!isReportableFailure(subject)) return;

            try {
                report(subject);
            } catch {
                // Telemetry is strictly observational — a broken transport must
                // never turn a handled API failure into a thrown one. The console
                // leg above already ran, so the failure is not lost.
            }
        }
    };
}
