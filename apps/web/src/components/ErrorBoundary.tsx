import React from "react";
import { withTranslation, WithTranslation } from "react-i18next";
import { logger } from "../utils/logger";
import { reportCaughtError } from "../lib/telemetry";
import ErrorReportControl from "./errorReport/ErrorReportControl";
import ReportControlGuard from "./errorReport/ReportControlGuard";

interface ErrorBoundaryProps extends WithTranslation {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  /** True while `ErrorReportControl` has a submission in flight. */
  isReportSending: boolean;
}

const describeError = (error: Error | null): string => {
  if (!error) return "";
  const name = error.name || "Error";
  return error.message ? `${name}: ${error.message}` : name;
};

class ErrorBoundaryClass extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
      isReportSending: false
    };
  }

  /**
   * Reload unloads the document, cancelling any request still in flight. Doing
   * that while the user's crash report is being submitted throws the report
   * away silently — on the one screen that exists to capture crashes nobody
   * would otherwise report, and with no indication anything was lost. So the
   * control tells us when it is sending and Reload waits.
   */
  private onReportSendingChange = (isReportSending: boolean): void => {
    this.setState({ isReportSending });
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);
    // Kept, not discarded: the component stack is the single most useful thing
    // a crash report can carry, and it exists only inside this callback.
    this.setState({ componentStack: errorInfo.componentStack ?? null });
    // Report to the collector WITHOUT waiting for the user (R16). Catching here
    // stops the error propagating, so the SDK's automatic global handler never
    // sees it — every render crash would otherwise be invisible. The report
    // control rendered below is the separate, user-driven feedback path; it is
    // not a substitute for this.
    reportCaughtError(error, errorInfo.componentStack ?? null);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-text">
              {t("ErrorBoundaryTitle")}
            </h1>
            <p className="mb-6 text-text">
              {t("ErrorBoundaryMessage")}
            </p>
            <button
              onClick={() => window.location.reload()}
              disabled={this.state.isReportSending}
              className="rounded-control bg-accent px-6 py-2 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("ErrorBoundaryReload")}
            </button>
            {/*
              KTD3: no capture on this path. React has already replaced the
              failed subtree with this fallback, so the only thing a screenshot
              could show is the error screen itself. The report carries the
              error text and the component stack instead.
            */}
            <ReportControlGuard>
              <div className="mt-4 flex flex-col items-center">
                <ErrorReportControl
                  errorText={describeError(this.state.error)}
                  componentStack={this.state.componentStack}
                  captureScreen={false}
                  onSendingChange={this.onReportSendingChange}
                />
              </div>
            </ReportControlGuard>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ErrorBoundary = withTranslation()(ErrorBoundaryClass);
export default ErrorBoundary;
