import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import RoutineStep from "./RoutineStep";

const suggestion = {
  name: "Morning flow", iconId: "lucide:sun", scheduleDays: ["Monday"],
  sections: [
    { name: "Wake", iconId: "lucide:sun", startTime: "07:00", endTime: "08:00",
      habits: [{ name: "Run", startTime: "07:00", endTime: "07:30" }], tasks: [] },
    { name: "Evening", iconId: "lucide:moon", startTime: "19:00", endTime: "21:00", habits: [], tasks: [] }
  ]
};

describe("RoutineStep", () => {
  test("removing an item excludes it from the accepted draft", () => {
    const onAccept = vi.fn();
    render(<RoutineStep suggestion={suggestion} onAccept={onAccept} onRegenerate={vi.fn()} loading={false} />);
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingRemoveItem" }));
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingRoutineAccept" }));
    expect(onAccept.mock.calls[0][0].sections[0].habits).toEqual([]);
  });


  test("move earlier swaps time slots with the previous item, keeping durations", () => {
    const onAccept = vi.fn();
    const twoItems = {
      ...suggestion,
      sections: [
        { name: "Wake", iconId: "lucide:sun", startTime: "07:00", endTime: "09:00",
          habits: [{ name: "Run", startTime: "07:00", endTime: "07:30" }],
          tasks: [{ name: "Stretch", startTime: "07:30", endTime: "07:40" }] }
      ]
    };
    render(<RoutineStep suggestion={twoItems} onAccept={onAccept} onRegenerate={vi.fn()} loading={false} />);

    // "Stretch" (07:30, second chronologically) moves earlier — it takes the
    // 07:00 start with its own 10min duration; "Run" follows with its 30min.
    const earlierButtons = screen.getAllByRole("button", { name: "AiOnboardingMoveEarlier" });
    fireEvent.click(earlierButtons[1]);
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingRoutineAccept" }));

    const accepted = onAccept.mock.calls[0][0];
    expect(accepted.sections[0].tasks[0]).toEqual({ name: "Stretch", startTime: "07:00", endTime: "07:10" });
    expect(accepted.sections[0].habits[0]).toEqual({ name: "Run", startTime: "07:10", endTime: "07:40" });
  });

  test("feedback triggers regenerate", () => {
    const onRegenerate = vi.fn();
    render(<RoutineStep suggestion={suggestion} onAccept={vi.fn()} onRegenerate={onRegenerate} loading={false} />);
    fireEvent.change(screen.getByPlaceholderText("AiOnboardingRoutineFeedbackPlaceholder"),
      { target: { value: "I wake at 6" } });
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingRoutineRegenerate" }));
    expect(onRegenerate).toHaveBeenCalledWith("I wake at 6");
  });

  test("weekday toggle changes accepted days", () => {
    const onAccept = vi.fn();
    render(<RoutineStep suggestion={suggestion} onAccept={onAccept} onRegenerate={vi.fn()} loading={false} />);
    fireEvent.click(screen.getByRole("button", { name: /TUESDAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingRoutineAccept" }));
    expect(onAccept.mock.calls[0][1]).toEqual(["Monday", "Tuesday"]);
  });

  test("moving an item to another section keeps its times", () => {
    const onAccept = vi.fn();
    render(<RoutineStep suggestion={suggestion} onAccept={onAccept} onRegenerate={vi.fn()} loading={false} />);
    fireEvent.change(screen.getByRole("combobox", { name: "AiOnboardingMoveToSection" }),
      { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingRoutineAccept" }));
    const edited = onAccept.mock.calls[0][0];
    expect(edited.sections[0].habits).toEqual([]);
    expect(edited.sections[1].habits).toEqual([{ name: "Run", startTime: "07:00", endTime: "07:30" }]);
  });

  test("a regenerated suggestion replaces local edits", () => {
    const onAccept = vi.fn();
    const { rerender } = render(
      <RoutineStep suggestion={suggestion} onAccept={onAccept} onRegenerate={vi.fn()} loading={false} />
    );
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingRemoveItem" }));

    const regenerated = {
      ...suggestion,
      name: "Fresh flow",
      sections: [{ name: "Dawn", iconId: "lucide:sun", startTime: "06:00", endTime: "07:00",
        habits: [{ name: "Stretch", startTime: "06:00", endTime: "06:10" }], tasks: [] }]
    };
    rerender(<RoutineStep suggestion={regenerated} onAccept={onAccept} onRegenerate={vi.fn()} loading={false} />);

    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingRoutineAccept" }));
    expect(onAccept.mock.calls[0][0].name).toBe("Fresh flow");
    expect(onAccept.mock.calls[0][0].sections[0].habits).toEqual(
      [{ name: "Stretch", startTime: "06:00", endTime: "06:10" }]);
  });
});
