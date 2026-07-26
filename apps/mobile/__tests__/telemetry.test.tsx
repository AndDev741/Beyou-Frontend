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
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ErrorBoundary from '../src/ui/ErrorBoundary';

const initMock = Sentry.init as unknown as jest.Mock;
const captureMock = Sentry.captureException as unknown as jest.Mock;

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
