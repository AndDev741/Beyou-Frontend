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
  captureException: vi.fn(),
  breadcrumbsIntegration: vi.fn((options) => ({ name: "Breadcrumbs", options }))
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

describe("credential scrubbing", () => {
    // Both of these are live single-use credentials read straight out of the
    // query string (reset.tsx:32, verify.tsx:14). httpContextIntegration is a
    // DEFAULT integration and puts the full href on every event, so without the
    // scrub a failure on either screen hands the token to the collector for the
    // whole retention window.
    it("strips the query string off the event URL", async () => {
        const { dropNoisyEvents } = await loadTelemetry();

        const event = {
            request: { url: "https://beyou.app/reset-password?token=live-single-use-token" }
        } as ErrorEvent;

        const sent = dropNoisyEvents(event, {} as EventHint);

        expect(sent).not.toBeNull();
        expect(sent!.request!.url).toBe("https://beyou.app/reset-password");
        expect(JSON.stringify(sent)).not.toContain("live-single-use-token");
    });

    it("strips the query string off navigation and request breadcrumbs", async () => {
        const { dropNoisyEvents } = await loadTelemetry();

        const event = {
            breadcrumbs: [
                { data: { from: "/dashboard", to: "/auth/verify?token=verify-token" } },
                { data: { url: "https://beyou.app/api/v1/auth/reset?token=reset-token" } }
            ]
        } as unknown as ErrorEvent;

        const sent = dropNoisyEvents(event, {} as EventHint);

        expect(JSON.stringify(sent)).not.toContain("verify-token");
        expect(JSON.stringify(sent)).not.toContain("reset-token");
        expect(sent!.breadcrumbs![0].data!.to).toBe("/auth/verify");
    });

    it("leaves a URL with no query string untouched", async () => {
        const { dropNoisyEvents } = await loadTelemetry();

        const event = { request: { url: "https://beyou.app/routines" } } as ErrorEvent;

        expect(dropNoisyEvents(event, {} as EventHint)!.request!.url)
            .toBe("https://beyou.app/routines");
    });
});

describe("ui breadcrumb scrubbing", () => {
    // The previous attempt configured dom.serializeAttribute and asserted the
    // integration was CALLED with it. That passed while still leaking: in
    // @sentry/core/utils/browser.js the allowlist only replaces the #id/.class
    // branch, and the loop over ["aria-label", "type", "name", "title", "alt"]
    // runs unconditionally afterwards. These tests therefore assert on the
    // produced breadcrumb message.
    it("strips a habit name carried in aria-label off a click breadcrumb", async () => {
        const { scrubUiBreadcrumb } = await loadTelemetry();

        const crumb = scrubUiBreadcrumb({
            category: "ui.click",
            message: 'input[aria-label="Ler Hamlet por 30 minutos"]'
        });

        expect(crumb!.message).not.toContain("Ler Hamlet");
        expect(crumb!.message).toBe("input");
    });

    it("keeps type but drops every content-bearing attribute", async () => {
        const { scrubUiBreadcrumb } = await loadTelemetry();

        const crumb = scrubUiBreadcrumb({
            category: "ui.input",
            message: 'input[aria-label="Meta secreta"][type="checkbox"][title="dica"][name="campo"][alt="imagem"]'
        });

        expect(crumb!.message).toBe('input[type="checkbox"]');
        for (const leaked of ["Meta secreta", "dica", "campo", "imagem"]) {
            expect(crumb!.message).not.toContain(leaked);
        }
    });

    // The serialiser does not escape attribute values (@sentry/core
    // utils/browser.js line 72: `out.push(`[${k}="${attr}"]`)`), so a habit name
    // containing a quote, a bracket or the " > " path separator produces a
    // message no attribute-matching regex can carve up correctly. Each of these
    // is a name a user can actually type into the habit form.
    it("leaks nothing when the label itself contains double quotes", async () => {
        const { scrubUiBreadcrumb } = await loadTelemetry();

        // `[^"]*` stops at the first inner quote and leaves `Hamlet" hoje"]`.
        const crumb = scrubUiBreadcrumb({
            category: "ui.click",
            message: 'input[aria-label="Ler "Hamlet" hoje"]'
        });

        expect(crumb!.message).toBe("input");
        expect(crumb!.message).not.toContain("Hamlet");
        expect(crumb!.message).not.toContain("hoje");
    });

    it("leaks nothing when the label contains square brackets", async () => {
        const { scrubUiBreadcrumb } = await loadTelemetry();

        const crumb = scrubUiBreadcrumb({
            category: "ui.click",
            message: 'button[title="Terapia [confidencial] semanal"][alt="]["]'
        });

        expect(crumb!.message).toBe("button");
        expect(crumb!.message).not.toContain("confidencial");
        expect(crumb!.message).not.toContain("[");
    });

    it("leaks nothing when the label contains the DOM path separator", async () => {
        const { scrubUiBreadcrumb } = await loadTelemetry();

        // htmlTreeAsString joins ancestors with " > ", so a value containing it
        // is indistinguishable from a further element in the chain.
        const crumb = scrubUiBreadcrumb({
            category: "ui.click",
            message: 'div > button[aria-label="Ler > Hamlet > hoje"]'
        });

        expect(crumb!.message).toBe("div > button");
        expect(crumb!.message).not.toContain("Hamlet");
    });

    it("keeps the ancestor chain and drops ids, classes and every value", async () => {
        const { scrubUiBreadcrumb } = await loadTelemetry();

        const crumb = scrubUiBreadcrumb({
            category: "ui.click",
            message:
                'div#habit-list.grid.gap-2 > form > input[aria-label="Ler Hamlet"][type="checkbox"]'
        });

        expect(crumb!.message).toBe('div > form > input[type="checkbox"]');
    });

    it("drops a type value the label forged, keeping only real HTML tokens", async () => {
        const { scrubUiBreadcrumb } = await loadTelemetry();

        // A habit named `x"][type="Segredo` serialises to exactly this, so a
        // matcher that trusts the LOOK of a type attribute carries the name out.
        const crumb = scrubUiBreadcrumb({
            category: "ui.click",
            message: 'input[aria-label="x"][type="Segredo"]'
        });

        expect(crumb!.message).toBe("input");
        expect(crumb!.message).not.toContain("Segredo");
    });

    it("leaves a breadcrumb that is not a ui event alone", async () => {
        const { scrubUiBreadcrumb } = await loadTelemetry();

        const crumb = scrubUiBreadcrumb({
            category: "navigation",
            message: 'from /a to /b [name="keep me"]'
        });

        expect(crumb!.message).toBe('from /a to /b [name="keep me"]');
    });

    it("is the beforeBreadcrumb the SDK was configured with", async () => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.stubEnv("VITE_SENTRY_DSN", DSN);

        const { initTelemetry, scrubUiBreadcrumb } = await loadTelemetry();
        expect(initTelemetry()).toBe(true);

        expect(initMock.mock.calls[0][0].beforeBreadcrumb).toBe(scrubUiBreadcrumb);
    });
});

describe("referer scrubbing", () => {
    // httpContextIntegration writes headers.Referer from document.referrer, and
    // the interceptor navigates on a failed refresh — so a token-bearing URL
    // becomes the next page's referrer even after request.url is scrubbed.
    it("strips the query string off the Referer header", async () => {
        const { dropNoisyEvents } = await loadTelemetry();

        const event = {
            request: {
                url: "https://beyou.app/",
                headers: { Referer: "https://beyou.app/reset-password?token=leaked-token" }
            }
        } as unknown as ErrorEvent;

        const sent = dropNoisyEvents(event, {} as EventHint);

        expect(JSON.stringify(sent)).not.toContain("leaked-token");
        expect(sent!.request!.headers!.Referer).toBe("https://beyou.app/reset-password");
    });
});
