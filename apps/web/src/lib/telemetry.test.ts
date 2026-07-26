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
