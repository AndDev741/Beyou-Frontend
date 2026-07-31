import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Sentry from '@sentry/react-native';
import i18next from 'i18next';
import ErrorReport from './feedback/ErrorReport';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: unknown;
  componentStack?: string;
  /** True while `ErrorReport` has a submission in flight. */
  isReportSending: boolean;
}

/**
 * App-level crash boundary — catches render errors anywhere below it and shows a
 * recoverable fallback instead of a white screen. A class component because error
 * boundaries can't be hooks; styling still works via NativeWind className, and
 * copy reads from the already-initialised i18next instance.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: undefined, isReportSending: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Kept so the crash report can carry the component stack (R8/KTD3) — the
    // error alone rarely says WHICH screen blew up.
    this.setState({ componentStack: info?.componentStack ?? undefined });
    // Report to the collector WITHOUT waiting for the user (R16). This call is
    // load-bearing rather than belt-and-braces: catching an error here stops it
    // propagating, so React Native's global handler never sees it and the SDK's
    // automatic capture would miss every render crash. `ErrorReport` below is the
    // separate, user-driven feedback path — it is not a substitute for this.
    // No-op when telemetry was never initialised (no DSN → no bound client).
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info?.componentStack ?? undefined } },
    });
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error);
  }

  /**
   * Clearing `hasError` unmounts this whole fallback — and `ErrorReport` with
   * it. Doing that mid-send throws the user's crash report away silently, on
   * the one screen that exists to capture crashes nobody would otherwise
   * report. Retry keeps top billing; it just waits for the report to land.
   * Same defect and same shape as the web boundary's Reload button.
   */
  reset = () => {
    if (this.state.isReportSending) return;
    this.setState({ hasError: false, error: undefined, componentStack: undefined });
  };

  onReportSendingChange = (isReportSending: boolean) => this.setState({ isReportSending });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-8" testID="error-boundary">
        <Text className="text-5xl">😵</Text>
        <Text className="text-secondary text-center text-lg font-bold">{i18next.t('SomethingWentWrong')}</Text>
        <Pressable
          onPress={this.reset}
          disabled={this.state.isReportSending}
          accessibilityRole="button"
          accessibilityState={{ disabled: this.state.isReportSending }}
          testID="error-retry"
          className={`rounded-full bg-primary px-5 py-2.5 ${
            this.state.isReportSending ? 'opacity-60' : ''
          }`}
        >
          <Text className="text-background font-semibold">{i18next.t('TryAgain')}</Text>
        </Pressable>
        {/* R8: reporting is offered, never demanded — retry keeps top billing. */}
        <ErrorReport
          error={this.state.error}
          componentStack={this.state.componentStack}
          onSendingChange={this.onReportSendingChange}
        />
      </View>
    );
  }
}
