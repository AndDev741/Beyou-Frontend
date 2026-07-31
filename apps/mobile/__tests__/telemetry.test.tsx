/**
 * Error telemetry wiring (R16).
 *
 * SCOPE WARNING — read before trusting these tests.
 * These assert the JS call path only: that the SDK is left uninitialised without
 * a DSN, that it is initialised error-only with one, and that a thrown render
 * error is handed to `captureException`. The SDK is mocked (see jest.setup.js),
 * so NOTHING here proves an event is actually transmitted to the collector.
 * That is the KTD7 gate and it needs a release build on a physical device.
 */
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { ApiError, createReportingLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ErrorBoundary from '../src/ui/ErrorBoundary';

const initMock = Sentry.init as unknown as jest.Mock;
const captureMock = Sentry.captureException as unknown as jest.Mock;

const DSN = 'http://publickey@localhost:8000/1';

const ORIGINAL_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Re-import telemetry.ts so its module-level `initialised` latch starts fresh. */
const loadTelemetry = () => {
  let mod!: typeof import('../src/lib/telemetry');
  jest.isolateModules(() => {
    mod = require('../src/lib/telemetry');
  });
  return mod;
};

beforeEach(() => {
  // Clear ONLY our own spies. `jest.clearAllMocks()` also wipes the internal
  // binding @testing-library/react-native uses to back `screen`, after which
  // every query fails with "`render` function has not been called" even though
  // render ran. Targeted mockClear() avoids that trap.
  initMock.mockClear();
  captureMock.mockClear();
});

afterEach(() => {
  if (ORIGINAL_DSN === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  else process.env.EXPO_PUBLIC_SENTRY_DSN = ORIGINAL_DSN;
});

describe('initTelemetry', () => {
  test('does not initialise the SDK when no DSN is configured', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;

    const { initTelemetry, isTelemetryInitialised } = loadTelemetry();
    const result = initTelemetry();

    expect(result).toBe(false);
    expect(isTelemetryInitialised()).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  test('treats a blank DSN as unset so an empty .env line disables reporting', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = '   ';

    const { initTelemetry } = loadTelemetry();

    expect(initTelemetry()).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  test('initialises with the DSN and with tracing disabled when one is configured', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'http://publickey@localhost:8000/1';

    const { initTelemetry, isTelemetryInitialised } = loadTelemetry();
    const result = initTelemetry();

    expect(result).toBe(true);
    expect(isTelemetryInitialised()).toBe(true);
    expect(initMock).toHaveBeenCalledTimes(1);

    const options = initMock.mock.calls[0][0];
    expect(options.dsn).toBe('http://publickey@localhost:8000/1');
    // Errors only — the collector must not be filled with transactions.
    expect(options.tracesSampleRate).toBe(0);
    expect(options.enableAutoPerformanceTracing).toBe(false);
    // Telemetry must not carry user data.
    expect(options.sendDefaultPii).toBe(false);
  });

  test('is idempotent — a second call does not re-initialise the SDK', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'http://publickey@localhost:8000/1';

    const { initTelemetry } = loadTelemetry();
    initTelemetry();
    initTelemetry();

    expect(initMock).toHaveBeenCalledTimes(1);
  });
});

describe('thrown JavaScript errors', () => {
  const Boom = (): never => {
    throw new Error('kaboom');
  };

  /** Same shape as ErrorBoundary.test.tsx — the render pattern this repo uses. */
  const wrap = async (node: React.ReactElement) =>
    render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

  test('a thrown render error is reported without any user action', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await wrap(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    // Reported purely as a side effect of the crash — nothing was pressed.
    expect(captureMock).toHaveBeenCalledTimes(1);
    const [reported, context] = captureMock.mock.calls[0];
    expect((reported as Error).message).toBe('kaboom');
    // The component stack is what says WHICH screen blew up.
    expect(context.contexts.react.componentStack).toBeTruthy();

    // Still shows the recoverable fallback rather than a white screen.
    expect(screen.getByTestId('error-boundary')).toBeTruthy();

    consoleSpy.mockRestore();
  });

  test('reports nothing extra when a child renders successfully', async () => {
    await wrap(
      <ErrorBoundary>
        <Text>all good</Text>
      </ErrorBoundary>,
    );

    expect(screen.getByText('all good')).toBeTruthy();
    expect(captureMock).not.toHaveBeenCalled();
  });
});

/**
 * Handled API failures (R16 gap).
 *
 * The shared API client never throws — every operation returns `{ success?,
 * error? }` and routes the failure through `getLogger().error(...)`. A backend
 * outage or an unreachable host is therefore *handled*, so neither the global
 * handler nor the ErrorBoundary ever sees it and the collector stayed empty
 * during real incidents. The logger installed in `app/_layout.tsx` closes that
 * gap; these tests pin the app-side half (the classifier lives in `@beyou/api`
 * and is tested there).
 */
describe('handled API failure reporting', () => {
  /** Builds the exact logger `_layout.tsx` installs, over a spied console leg. */
  const installedLogger = (dsn: string) => {
    if (dsn) process.env.EXPO_PUBLIC_SENTRY_DSN = dsn;
    else delete process.env.EXPO_PUBLIC_SENTRY_DSN;

    const { initTelemetry, reportHandledFailure } = loadTelemetry();
    initTelemetry();

    const consoleError = jest.fn();
    return {
      logger: createReportingLogger({ error: consoleError }, reportHandledFailure),
      consoleError,
    };
  };

  test('reports a 5xx — a backend outage is no longer invisible', () => {
    const { logger } = installedLogger(DSN);
    const failure = new ApiError(500, { errorKey: 'INTERNAL' });

    logger.error(failure);

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock.mock.calls[0][0]).toBe(failure);
  });

  test('does NOT report a 4xx — the server correctly rejected the request', () => {
    const { logger } = installedLogger(DSN);

    logger.error(new ApiError(400, { errorKey: 'ValidationError' }));
    logger.error(new ApiError(401, undefined, 'Unauthorized'));
    logger.error(new ApiError(404, { errorKey: 'FEEDBACK_NOT_FOUND' }));
    logger.error(new ApiError(429, { errorKey: 'RATE_LIMIT_EXCEEDED' }));

    expect(captureMock).not.toHaveBeenCalled();
  });

  test('reports a network failure where no response was ever received', () => {
    const { logger } = installedLogger(DSN);

    // What nativeHttpClient throws for an unreachable host or its own timeout.
    logger.error(new ApiError(0, undefined, 'Network request failed'));
    logger.error(new ApiError(0, undefined, 'Request timed out after 20000ms'));

    expect(captureMock).toHaveBeenCalledTimes(2);
  });

  test('reports nothing at all when no DSN is configured', () => {
    const { logger, consoleError } = installedLogger('');

    logger.error(new ApiError(500));
    logger.error(new ApiError(0, undefined, 'Network request failed'));
    logger.error(new TypeError('boom'));

    expect(initMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
    // Inert for the collector, but still visible locally.
    expect(consoleError).toHaveBeenCalledTimes(3);
  });

  test('still writes to the console for every failure class', () => {
    const { logger, consoleError } = installedLogger(DSN);

    logger.error(new ApiError(500));
    logger.error(new ApiError(403));
    logger.error(new ApiError(0, undefined, 'Network request failed'));
    logger.error('agentStream: malformed done event');

    expect(consoleError).toHaveBeenCalledTimes(4);
  });

  test('tags handled failures so they are distinguishable from render crashes', () => {
    const { logger } = installedLogger(DSN);

    logger.error(new ApiError(503));

    const [, context] = captureMock.mock.calls[0];
    expect(context.tags.handled).toBe('api');
    // No component stack — a handled API failure did not crash a render, and
    // claiming otherwise would make the two paths look like the same issue.
    expect(context.contexts).toBeUndefined();
  });
});
