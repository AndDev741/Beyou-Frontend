import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import OnboardingTutorial from "./OnboardingTutorial";

// The app's test setup (src/setupTests.tsx) stubs react-i18next so t(key) === key.
// Tests therefore assert on the raw i18n keys, matching the repo convention used in
// SpotlightTutorial.test.tsx.

function walkToFork() {
  // 5 intro cards: click Next 4 times, then the final button reveals the fork.
  for (let i = 0; i < 4; i++) {
    fireEvent.click(screen.getByRole("button", { name: /TutorialNext/i }));
  }
  fireEvent.click(screen.getByRole("button", { name: /TutorialGetStarted/i }));
}

describe("OnboardingTutorial path fork", () => {
  test("last card leads to fork with two path cards", () => {
    render(
      <OnboardingTutorial onComplete={vi.fn()} onSkip={vi.fn()} onChooseAi={vi.fn()} />
    );
    walkToFork();
    expect(screen.getByText("TutorialPathTitle")).toBeInTheDocument();
    expect(screen.getByText("TutorialPathAiTitle")).toBeInTheDocument();
    expect(screen.getByText("TutorialPathManualTitle")).toBeInTheDocument();
  });

  test("choosing AI calls onChooseAi; choosing manual calls onComplete", () => {
    const onComplete = vi.fn();
    const onChooseAi = vi.fn();
    render(
      <OnboardingTutorial
        onComplete={onComplete}
        onSkip={vi.fn()}
        onChooseAi={onChooseAi}
      />
    );
    walkToFork();
    fireEvent.click(screen.getByRole("button", { name: /TutorialPathAiTitle/i }));
    expect(onChooseAi).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  test("choosing manual calls onComplete; not onChooseAi", () => {
    const onComplete = vi.fn();
    const onChooseAi = vi.fn();
    render(
      <OnboardingTutorial
        onComplete={onComplete}
        onSkip={vi.fn()}
        onChooseAi={onChooseAi}
      />
    );
    walkToFork();
    fireEvent.click(screen.getByRole("button", { name: /TutorialPathManualTitle/i }));
    expect(onComplete).toHaveBeenCalled();
    expect(onChooseAi).not.toHaveBeenCalled();
  });
});
