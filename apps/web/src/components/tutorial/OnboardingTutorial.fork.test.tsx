import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import OnboardingTutorial from "./OnboardingTutorial";

// The app's test setup (src/setupTests.tsx) stubs react-i18next so t(key) === key.
// Tests therefore assert on the raw i18n keys, matching the repo convention used in
// SpotlightTutorial.test.tsx.

function walkToFork() {
  // 7 intro cards: click Next 6 times, then the final button reveals the fork.
  for (let i = 0; i < 6; i++) {
    fireEvent.click(screen.getByRole("button", { name: /TutorialNext/i }));
  }
  fireEvent.click(screen.getByRole("button", { name: /TutorialGetStarted/i }));
}

describe("OnboardingTutorial intro cards", () => {
  test("the diary and the notebook get a card before the fork", async () => {
    render(
      <OnboardingTutorial onComplete={vi.fn()} onSkip={vi.fn()} onChooseAi={vi.fn()} />
    );
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole("button", { name: /TutorialNext/i }));
    }
    // The cards swap through an exit animation, so the next title lands a tick later.
    expect(await screen.findByRole("heading", { name: "TutorialMoodTitle" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /TutorialNext/i }));
    expect(await screen.findByRole("heading", { name: "TutorialNotebookTitle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /TutorialGetStarted/i })).toBeInTheDocument();
  });
});

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
