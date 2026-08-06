import { renderWithProviders } from "../../test/test-utils";
import GoalBox from "./goalBox";
import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";

// Mock services used by GoalBox
vi.mock("@beyou/api/goals/getGoals", () => ({
  default: vi.fn().mockResolvedValue({ success: [] }),
}));

vi.mock("@beyou/api/goals/deleteGoal", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("@beyou/api/goals/markGoalAsComplete", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("@beyou/api/goals/increaseCurrentValue", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("@beyou/api/goals/decreaseCurrentValue", () => ({
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

    expect(screen.getByText("Test Goal")).toBeInTheDocument();
    // O anel de porcentagem saiu do cartão; o que resta é o contador do
    // stepper, que nunca pode virar NaN.
    expect(screen.getByText("0/0 pages")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    // Alvo 0 não é "alvo batido": Concluir não aparece.
    expect(screen.queryByRole("button", { name: "Complete" })).toBeNull();
  });

  it("renders correct progress for normal targetValue", () => {
    renderWithProviders(
      <GoalBox {...baseProps} targetValue={100} currentValue={50} />
    );

    expect(screen.getByText("Test Goal")).toBeInTheDocument();
    expect(screen.getByText("50/100 pages")).toBeInTheDocument();
  });

  it("only offers Complete once the target is reached", () => {
    const { unmount } = renderWithProviders(
      <GoalBox {...baseProps} targetValue={10} currentValue={9} />
    );
    expect(screen.queryByRole("button", { name: "Complete" })).toBeNull();
    expect(screen.getByRole("button", { name: "Increase" })).toBeInTheDocument();
    unmount();

    renderWithProviders(<GoalBox {...baseProps} targetValue={10} currentValue={10} />);
    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
    // Batido o alvo, o + sai de cena: o que resta a fazer é concluir.
    expect(screen.queryByRole("button", { name: "Increase" })).toBeNull();
  });

  it("a completed goal shows Undo and the XP it earned", () => {
    renderWithProviders(
      <GoalBox {...baseProps} status="COMPLETED" targetValue={10} currentValue={10} />
    );

    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete" })).toBeNull();
    expect(screen.getAllByText("GoalXpEarned").length).toBeGreaterThan(0);
  });

  it("expanding reveals motivation and the period", () => {
    renderWithProviders(
      <GoalBox {...baseProps} targetValue={10} currentValue={1} />
    );

    expect(screen.queryByText(/Stay motivated/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));

    expect(screen.getByText(/Stay motivated/)).toBeInTheDocument();
  });
});
