import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import SummaryStep from "./SummaryStep";

describe("SummaryStep", () => {
  const data = {
    categories: [{ id: "c", name: "Health" }], habits: [{ id: "h", name: "Run" }],
    tasks: [], goals: [{ id: "g", name: "Read" }], routineName: "Morning flow", freeTexts: []
  };

  test("lists created entities and fires both CTAs", () => {
    const onStart = vi.fn(); const onTour = vi.fn();
    render(<SummaryStep data={data} onStart={onStart} onTour={onTour} />);
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Morning flow")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingStart" }));
    expect(onStart).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingTour" }));
    expect(onTour).toHaveBeenCalled();
  });

  test("omits empty groups and shows populated group labels", () => {
    render(<SummaryStep data={data} onStart={vi.fn()} onTour={vi.fn()} />);
    // tasks group is empty -> its label must not render
    expect(screen.queryByText("AiOnboardingSummaryTasks")).not.toBeInTheDocument();
    expect(screen.getByText("AiOnboardingSummaryCategories")).toBeInTheDocument();
    expect(screen.getByText("AiOnboardingSummaryHabits")).toBeInTheDocument();
    expect(screen.getByText("AiOnboardingSummaryRoutine")).toBeInTheDocument();
    expect(screen.getByText("AiOnboardingSummaryGoals")).toBeInTheDocument();
  });

  test("omits the routine group when no routine was created", () => {
    render(
      <SummaryStep
        data={{ ...data, routineName: undefined }}
        onStart={vi.fn()}
        onTour={vi.fn()}
      />
    );
    expect(screen.queryByText("AiOnboardingSummaryRoutine")).not.toBeInTheDocument();
  });
});
