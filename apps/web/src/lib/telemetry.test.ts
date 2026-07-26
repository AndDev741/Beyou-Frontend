import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ErrorEvent, EventHint } from "@sentry/react";

/**
 * Unhandled-error telemetry wiring (R16/R18).
 *
 * SCOPE WARNING — read before trusting these tests.
 * The SDK is mocked, so these assert the JS call path only: that nothing is
 * initialised without a DSN, that it is initialised errors-only with one, that
 * the noise filter refuses to send, and that the crash boundary reports what it
 * caught. NOTHING here proves an event reaches the collector — that needs a
 * running GlitchTip and a real browser.
 */
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  captureException: vi.fn()
}));

import * as Sentry from "@sentry/react";

const initMock = Sentry.init as unknown as ReturnType<typeof vi.fn>;
const captureMock = Sentry.captureException as unknown as ReturnType<typeof vi.fn>;

const DSN = "http://publickey@localhost:8000/1";

/** Re-import so the module-level "already initialised" latch starts fresh. */
async function loadTelemetry() {
  vi.resetModules();
  return import("./telemetry");
}

/** The `beforeSend` the SDK was actually configured with — the real send gate. */
function configuredBeforeSend(): (
  event: ErrorEvent,
  hint: EventHint
) => ErrorEvent | null {
  return initMock.mock.calls[0][0].beforeSend;
}

const eventWithFrame = (filename: string): ErrorEvent =>
  ({
    exception: {
      values: [
        {
          type: "TypeError",
          value: "x is not a function",
          stacktrace: { frames: [{ filename }] }
        }
      ]
    }
  }) as unknown as ErrorEvent;

const eventWithError = (type: string, value: string): ErrorEvent =>
  ({
    exception: { values: [{ type, value, stacktrace: { frames: [] } }] }
  }) as unknown as ErrorEvent;

describe("initTelemetry", () => {
  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not initialise the SDK when no DSN is configured", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");

    const { initTelemetry, isTelemetryInitialised } = await loadTelemetry();

    expect(initTelemetry()).toBe(false);
    expect(isTelemetryInitialised()).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  it("treats a blank DSN as unset so an empty .env line disables reporting", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "   ");

    const { initTelemetry } = await loadTelemetry();

    expect(initTelemetry()).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  it("initialises errors-only, without PII, carrying a release identifier", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", DSN);

    const { initTelemetry, isTelemetryInitialised, TELEMETRY_RELEASE } =
      await loadTelemetry();

    expect(initTelemetry()).toBe(true);
    expect(isTelemetryInitialised()).toBe(true);
    expect(initMock).toHaveBeenCalledTimes(1);

    const options = initMock.mock.calls[0][0];
    expect(options.dsn).toBe(DSN);
    // Errors only: the collector is an error store, not an APM.
    expect(options.tracesSampleRate).toBe(0);
    // Telemetry must never carry user data.
    expect(options.sendDefaultPii).toBe(false);
    // Must match the release the source maps are uploaded under (R18), or the
    // collector has maps it cannot associate with the event.
    expect(options.release).toBe(TELEMETRY_RELEASE);
    expect(TELEMETRY_RELEASE).toMatch(/^beyou-web@/);
  });

  it("is idempotent — a second call does not re-initialise the SDK", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", DSN);

    const { initTelemetry } = await loadTelemetry();
    initTelemetry();
    initTelemetry();

    expect(initMock).toHaveBeenCalledTimes(1);
  });
});

describe("noise filtering", () => {
  beforeEach(async () => {
    initMock.mockClear();
    captureMock.mockClear();
    vi.stubEnv("VITE_SENTRY_DSN", DSN);
    const { initTelemetry } = await loadTelemetry();
    initTelemetry();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["chrome-extension://abcdef/inject.js"],
    ["moz-extension://abcdef/inject.js"],
    ["safari-web-extension://abcdef/inject.js"]
  ])("sends nothing for an error thrown by injected extension code (%s)", (filename) => {
    expect(configuredBeforeSend()(eventWithFrame(filename), {} as EventHint)).toBeNull();
  });

  it("sends nothing for a cancelled navigation or aborted request", () => {
    const beforeSend = configuredBeforeSend();

    expect(
      beforeSend(eventWithError("AbortError", "The operation was aborted."), {} as EventHint)
    ).toBeNull();
    expect(
      beforeSend(eventWithError("CanceledError", "canceled"), {} as EventHint)
    ).toBeNull();
  });

  it("sends nothing for the benign ResizeObserver loop warning", () => {
    expect(
      configuredBeforeSend()(
        eventWithError("Error", "ResizeObserver loop completed with undelivered notifications."),
        {} as EventHint
      )
    ).toBeNull();
  });

  it("still sends a genuine application error", () => {
    const event = eventWithFrame("https://beyou.app/assets/index-abc123.js");

    expect(configuredBeforeSend()(event, {} as EventHint)).toBe(event);
  });
});

describe("reportCaughtError", () => {
  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
  });

  it("reports the error together with the component stack", async () => {
    const { reportCaughtError } = await loadTelemetry();
    const error = new Error("kaboom");

    reportCaughtError(error, "\n    in ThrowingComponent\n    in ErrorBoundary");

    expect(captureMock).toHaveBeenCalledTimes(1);
    const [reported, context] = captureMock.mock.calls[0];
    expect(reported).toBe(error);
    // The component stack is what says WHICH screen blew up.
    expect(context.contexts.react.componentStack).toContain("ThrowingComponent");
  });

  it("still reports when no component stack is available", async () => {
    const { reportCaughtError } = await loadTelemetry();

    reportCaughtError(new Error("kaboom"), null);

    expect(captureMock).toHaveBeenCalledTimes(1);
  });
});

/**
 * Handled API failures (R16 gap).
 *
 * The shared API client never throws — every operation returns `{ success?,
 * error? }` and routes the failure through `getLogger().error(...)`. That means a
 * backend outage or a network timeout is *handled*, so neither `window.onerror`
 * nor the ErrorBoundary ever sees it and the collector stayed empty during real
 * incidents. The logger installed in `main.tsx` closes that gap; these tests pin
 * the app-side half of it (the classifier itself lives in `@beyou/api` and is
 * tested there).
 */
describe("handled API failure reporting", () => {
  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /**
   * Builds the exact logger `main.tsx` installs, over a spied console leg.
   *
   * `ApiError` is handed back from the SAME `@beyou/api` instance the classifier
   * came from. `loadTelemetry()` calls `vi.resetModules()`, so a copy imported
   * before that reset is a different class object and `instanceof` would miss —
   * making every 4xx look unrecognisable and get reported.
   */
  async function installedLogger(dsn: string) {
    vi.stubEnv("VITE_SENTRY_DSN", dsn);
    const { initTelemetry, reportHandledFailure } = await loadTelemetry();
    initTelemetry();
    const { createReportingLogger, ApiError } = await import("@beyou/api");
    const consoleError = vi.fn();
    return {
      logger: createReportingLogger({ error: consoleError }, reportHandledFailure),
      consoleError,
      ApiError
    };
  }

  it("reports a 5xx — a backend outage is no longer invisible", async () => {
    const { logger, ApiError } = await installedLogger(DSN);
    const failure = new ApiError(500, { errorKey: "INTERNAL" });

    logger.error(failure);

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock.mock.calls[0][0]).toBe(failure);
  });

  it("does NOT report a 4xx — the server correctly rejected the request", async () => {
    const { logger, ApiError } = await installedLogger(DSN);

    logger.error(new ApiError(400, { errorKey: "ValidationError" }));
    logger.error(new ApiError(401, undefined, "Unauthorized"));
    logger.error(new ApiError(404, { errorKey: "FEEDBACK_NOT_FOUND" }));
    logger.error(new ApiError(429, { errorKey: "RATE_LIMIT_EXCEEDED" }));

    expect(captureMock).not.toHaveBeenCalled();
  });

  it("reports a network failure where no response was ever received", async () => {
    const { logger, ApiError } = await installedLogger(DSN);

    logger.error(new ApiError(0, undefined, "Network Error"));

    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it("reports nothing at all when no DSN is configured", async () => {
    const { logger, consoleError, ApiError } = await installedLogger("");

    logger.error(new ApiError(500));
    logger.error(new ApiError(0, undefined, "Network Error"));
    logger.error(new TypeError("boom"));

    expect(initMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
    // Inert for the collector, but still visible locally.
    expect(consoleError).toHaveBeenCalledTimes(3);
  });

  it("still writes to the console for every failure class", async () => {
    const { logger, consoleError, ApiError } = await installedLogger(DSN);

    logger.error(new ApiError(500));
    logger.error(new ApiError(403));
    logger.error(new ApiError(0, undefined, "Network Error"));
    logger.error("agentStream: malformed done event");

    expect(consoleError).toHaveBeenCalledTimes(4);
  });

  it("tags handled failures so they are distinguishable from render crashes", async () => {
    const { logger, ApiError } = await installedLogger(DSN);

    logger.error(new ApiError(503));

    const [, context] = captureMock.mock.calls[0];
    expect(context.tags.handled).toBe("api");
    // No component stack — a handled API failure did not crash a render, and
    // claiming otherwise would make the two paths look like the same issue.
    expect(context.contexts).toBeUndefined();
  });
});
