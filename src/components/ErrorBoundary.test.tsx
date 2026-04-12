import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../translations/i18n";
import ErrorBoundary from "./ErrorBoundary";

function ThrowingComponent(): JSX.Element {
  throw new Error("Test error");
}

describe("ErrorBoundary", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
    render(
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByText("ErrorBoundaryTitle")).toBeInTheDocument();
    expect(screen.getByText("ErrorBoundaryMessage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ErrorBoundaryReload" })).toBeInTheDocument();
  });
});
