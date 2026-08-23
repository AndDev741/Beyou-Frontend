import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import type { TFunction } from "i18next";
import { ErrorBanner } from "./AiOnboardingWizard";
import { SuggestionCreateError } from "@beyou/state/onboarding/SuggestionCreateError";

/**
 * The banner has two shapes. Every failure used to land on "AI setup is
 * unavailable right now", including a rejected POST /habit where the AI had done
 * its part — the copy misled the user (retry later fixes nothing deterministic)
 * and misled the diagnosis. A creation failure now names what fell over and what
 * is already saved.
 */

// Renders interpolation so assertions can see which values reached the copy.
const t = ((key: string, options?: { kind?: string; name?: string }) =>
    options ? `${key}[${options.kind ?? ""}|${options.name ?? ""}]` : key) as TFunction;

const noop = () => undefined;

describe("ErrorBanner", () => {
    test("a suggestions failure keeps the AI-unavailable copy", () => {
        render(
            <ErrorBanner
                error={{ kind: "suggestions" }}
                savedNames={[]}
                onRetry={noop}
                onTakeTour={noop}
                t={t}
            />
        );
        expect(screen.getByText("AiOnboardingErrorTitle")).toBeInTheDocument();
        expect(screen.queryByText("AiOnboardingCreateErrorTitle")).not.toBeInTheDocument();
    });

    test("a creation failure names the entity, the reason and what is saved", () => {
        const failure = new SuggestionCreateError(
            "habit",
            "Meditate",
            "HABIT_CREATE_FAILED",
            ["Run"]
        );
        render(
            <ErrorBanner
                error={{ kind: "creation", failure }}
                savedNames={["Health", "Run"]}
                onRetry={noop}
                onTakeTour={noop}
                t={t}
            />
        );
        // No AI blame anywhere on this shape.
        expect(screen.queryByText("AiOnboardingErrorTitle")).not.toBeInTheDocument();
        expect(screen.getByText("AiOnboardingCreateErrorTitle")).toBeInTheDocument();
        // The description received the kind label and the failing name.
        expect(
            screen.getByText("AiOnboardingCreateErrorDescription[AiOnboardingEntityHabit|Meditate]")
        ).toBeInTheDocument();
        // The server's translated reason is shown verbatim.
        expect(screen.getByTestId("create-error-reason")).toHaveTextContent("HABIT_CREATE_FAILED");
        // What is already on the account, so the user knows their state.
        const saved = screen.getByTestId("create-error-saved");
        expect(saved).toHaveTextContent("Health");
        expect(saved).toHaveTextContent("Run");
        expect(screen.getByText("AiOnboardingCreateErrorRetryHint")).toBeInTheDocument();
    });

    test("retry still works from the creation shape", async () => {
        const onRetry = vi.fn();
        render(
            <ErrorBanner
                error={{
                    kind: "creation",
                    failure: new SuggestionCreateError("task", "Buy shoes", "nope")
                }}
                savedNames={[]}
                onRetry={onRetry}
                onTakeTour={noop}
                t={t}
            />
        );
        screen.getByRole("button", { name: "AiOnboardingRetry" }).click();
        expect(onRetry).toHaveBeenCalled();
    });
});
