import { renderWithProviders } from "../../test/test-utils";
import GoalBox from "./goalBox";
import { screen } from "@testing-library/react";
import { vi } from "vitest";

// Mock services used by GoalBox
vi.mock("../../services/goals/getGoals", () => ({
  default: vi.fn().mockResolvedValue({ success: [] }),
}));

vi.mock("../../services/goals/deleteGoal", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../services/goals/markGoalAsComplete", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../services/goals/increaseCurrentValue", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../services/goals/decreaseCurrentValue", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../hooks/useUiRefresh", () => ({
  default: vi.fn(),
}));

const baseProps = {
  id: "goal-1",
  title: "Test Goal",
  iconId: "FaStar",
  description: "A test goal description",
  unit: "pages",
  complete: false,
  categories: {} as Record<string, { name: string; iconId: string }>,
  motivation: "Stay motivated",
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-12-31"),
  xpReward: 100,
  status: "IN_PROGRESS",
  term: "SHORT_TERM",
};

describe("GoalBox", () => {
  it("renders without crashing when targetValue is 0 (no division by zero)", () => {
    renderWithProviders(
      <GoalBox {...baseProps} targetValue={0} currentValue={0} />
    );

    // Component should render title
    expect(screen.getByText("Test Goal")).toBeInTheDocument();

    // Progress ring should show 0% (not NaN% or Infinity%)
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.queryByText("NaN%")).not.toBeInTheDocument();
    expect(screen.queryByText("Infinity%")).not.toBeInTheDocument();
  });

  it("renders correct progress for normal targetValue", () => {
    renderWithProviders(
      <GoalBox {...baseProps} targetValue={100} currentValue={50} />
    );

    expect(screen.getByText("Test Goal")).toBeInTheDocument();
    // 50/100 * 100 = 50%
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
