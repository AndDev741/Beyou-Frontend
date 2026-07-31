import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../translations/i18n";

const mockSubmitFeedback = vi.fn();
vi.mock("@beyou/api/feedback/submitFeedback", () => ({
  default: (...args: unknown[]) => mockSubmitFeedback(...args)
}));

const mockCaptureScreenshot = vi.fn();
vi.mock("./errorReport/captureScreenshot", () => ({
  captureScreenshot: (...args: unknown[]) => mockCaptureScreenshot(...args),
  SCREENSHOT_FILE_NAME: "error-screen.png"
}));

/**
 * R16: the crash boundary must report on its own. Mocked at the SDK boundary so
 * the whole chain (boundary → telemetry → SDK) is exercised, not just an
 * internal call.
 */
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  captureException: vi.fn()
}));
import * as Sentry from "@sentry/react";
const mockCaptureException = Sentry.captureException as unknown as ReturnType<typeof vi.fn>;

/**
 * Lets one test simulate "the report feature is unavailable" (a broken or
 * unloadable control) without a second test file.
 */
const reportControl = vi.hoisted(() => ({ broken: false }));
vi.mock("./errorReport/ErrorReportControl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./errorReport/ErrorReportControl")>();
  return {
    ...actual,
    default: (props: Record<string, unknown>) => {
      if (reportControl.broken) throw new Error("report control unavailable");
      return React.createElement(actual.default, props as never);
    }
  };
});

import ErrorBoundary from "./ErrorBoundary";

function ThrowingComponent(): JSX.Element {
  throw new Error("Test error");
}

const renderBoundary = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    </I18nextProvider>
  );

describe("ErrorBoundary", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    reportControl.broken = false;
    mockSubmitFeedback.mockReset().mockResolvedValue({
      success: { feedback: { id: "fb-1" }, attachments: [], failedAttachments: [] }
    });
    mockCaptureScreenshot.mockReset().mockResolvedValue(null);
    mockCaptureException.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error occurs", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <p>Hello world</p>
        </ErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders fallback UI when a child throws", () => {
    renderBoundary();

    expect(screen.getByText("ErrorBoundaryTitle")).toBeInTheDocument();
    expect(screen.getByText("ErrorBoundaryMessage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ErrorBoundaryReload" })).toBeInTheDocument();
  });

  /**
   * KTD3: React commits the fallback BEFORE the report control exists, so the
   * only thing a capture could photograph on this path is the error screen
   * itself. The crash report carries text and stack instead — and must not
   * pretend a screenshot was taken.
   */
  it("sends a crash report carrying the error text and component stack, categorised as a bug", async () => {
    renderBoundary();

    fireEvent.click(screen.getByRole("button", { name: "FeedbackReportProblem" }));
    fireEvent.click(screen.getByRole("button", { name: "FeedbackReportSend" }));

    await waitFor(() => expect(mockSubmitFeedback).toHaveBeenCalledTimes(1));
    const [input] = mockSubmitFeedback.mock.calls[0];

    expect(input.category).toBe("BUG");
    expect(input.body).toContain("Test error");
    expect(input.body).toContain("ThrowingComponent");
    expect(input.attachments).toBeUndefined();
    expect(mockCaptureScreenshot).not.toHaveBeenCalled();
  });

  /**
   * R16: catching the error here stops it propagating, so the SDK's automatic
   * global handler never sees it. Without this explicit report every render
   * crash — the most valuable kind — would be invisible in the collector.
   */
  it("reports the caught error to the collector with no user action", () => {
    renderBoundary();

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const [reported, context] = mockCaptureException.mock.calls[0];
    expect((reported as Error).message).toBe("Test error");
    expect(context.contexts.react.componentStack).toContain("ThrowingComponent");
    // Nothing was clicked — the user-driven report control is a separate path.
    expect(mockSubmitFeedback).not.toHaveBeenCalled();
  });

  it("reports nothing when children render successfully", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <p>Hello world</p>
        </ErrorBoundary>
      </I18nextProvider>
    );

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("still renders its fallback and reload control when the report feature is unavailable", () => {
    reportControl.broken = true;

    renderBoundary();

    expect(screen.getByText("ErrorBoundaryTitle")).toBeInTheDocument();
    expect(screen.getByText("ErrorBoundaryMessage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ErrorBoundaryReload" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "FeedbackReportProblem" })
    ).not.toBeInTheDocument();
  });

  /**
   * G4/#11. Reload unloads the page, so pressing it while the report is still
   * in flight discards the submission silently — on the one screen that exists
   * to capture crashes nobody would otherwise report. Send-then-Reload must not
   * be a way to lose the report.
   */
  it("blocks reload while the crash report is still in flight", async () => {
    let settleSubmit!: (value: unknown) => void;
    mockSubmitFeedback.mockImplementation(
      () =>
        new Promise((resolve) => {
          settleSubmit = resolve;
        })
    );

    renderBoundary();

    const reload = screen.getByRole("button", { name: "ErrorBoundaryReload" });
    expect(reload).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "FeedbackReportProblem" }));
    fireEvent.click(screen.getByRole("button", { name: "FeedbackReportSend" }));

    await waitFor(() => expect(mockSubmitFeedback).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "ErrorBoundaryReload" })).toBeDisabled()
    );

    settleSubmit({ success: { feedback: { id: "fb-1" }, attachments: [], failedAttachments: [] } });

    await waitFor(() => expect(screen.getByTestId("error-report-success")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "ErrorBoundaryReload" })).not.toBeDisabled();
  });

  it("leaves the crash screen behaving as before when the user declines to report", () => {
    renderBoundary();

    fireEvent.click(screen.getByRole("button", { name: "FeedbackReportProblem" }));
    fireEvent.click(screen.getByRole("button", { name: "FeedbackReportCancel" }));

    expect(screen.getByText("ErrorBoundaryTitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ErrorBoundaryReload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FeedbackReportProblem" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "FeedbackReportSend" })).not.toBeInTheDocument();
    expect(mockSubmitFeedback).not.toHaveBeenCalled();
  });
});
