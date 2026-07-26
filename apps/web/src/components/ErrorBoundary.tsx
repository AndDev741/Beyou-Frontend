import React from "react";
import { withTranslation, WithTranslation } from "react-i18next";
import { logger } from "../utils/logger";
import ErrorReportControl from "./errorReport/ErrorReportControl";
import ReportControlGuard from "./errorReport/ReportControlGuard";

interface ErrorBoundaryProps extends WithTranslation {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
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
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);
    // Kept, not discarded: the component stack is the single most useful thing
    // a crash report can carry, and it exists only inside this callback.
    this.setState({ componentStack: errorInfo.componentStack ?? null });
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-secondary">
              {t("ErrorBoundaryTitle")}
            </h1>
            <p className="mb-6 text-secondary">
              {t("ErrorBoundaryMessage")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-6 py-2 text-white transition-opacity hover:opacity-90"
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
