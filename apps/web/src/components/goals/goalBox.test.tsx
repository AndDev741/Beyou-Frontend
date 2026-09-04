import { renderWithProviders } from "../../test/test-utils";
import GoalBox from "./goalBox";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import increaseCurrentValue from "@beyou/api/goals/increaseCurrentValue";
import decreaseCurrentValue from "@beyou/api/goals/decreaseCurrentValue";

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
    // The percentage ring left the card; what remains is the stepper's counter,
    // which must never turn into NaN.
    expect(screen.getByText("0/0 pages")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    // A target of 0 is not "target reached": Complete does not appear.
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
    // With the target hit the + steps aside: what is left to do is complete it.
    expect(screen.queryByRole("button", { name: "Increase" })).toBeNull();
  });

  it("a completed goal keeps the card and turns Complete into Undo", () => {
    renderWithProviders(
      <GoalBox {...baseProps} status="COMPLETED" targetValue={10} currentValue={10} />
    );

    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete" })).toBeNull();
    // The card stays the same: counter, XP and the done badge up top.
    expect(screen.getByText("10/10 pages")).toBeInTheDocument();
    expect(screen.getByText("+100 XP")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("the counter opens the progress modal, which adds the typed amount", async () => {
    renderWithProviders(<GoalBox {...baseProps} targetValue={100} currentValue={50} />);

    fireEvent.click(screen.getByRole("button", { name: /UpdateProgress/ }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(increaseCurrentValue).toHaveBeenCalledWith("goal-1", expect.anything(), 20)
    );
  });

  it("the progress modal also removes the typed amount", async () => {
    renderWithProviders(<GoalBox {...baseProps} targetValue={100} currentValue={50} />);

    fireEvent.click(screen.getByRole("button", { name: /UpdateProgress/ }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(decreaseCurrentValue).toHaveBeenCalledWith("goal-1", expect.anything(), 8)
    );
  });

  it("the stepper still moves one at a time", async () => {
    renderWithProviders(<GoalBox {...baseProps} targetValue={100} currentValue={50} />);

    fireEvent.click(screen.getByRole("button", { name: "Increase" }));

    await waitFor(() =>
      expect(increaseCurrentValue).toHaveBeenCalledWith("goal-1", expect.anything(), 1)
    );
  });

  it("keeps the full name reachable when the card clips it", () => {
    const title = "Regularizar-me em Portugal antes do fim do ano";
    renderWithProviders(
      <GoalBox {...baseProps} title={title} targetValue={10} currentValue={1} />
    );

    expect(screen.getByRole("heading", { name: title })).toHaveAttribute("title", title);
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

describe("GoalBox with sub-goals", () => {
  const child = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    name: `Child ${id}`,
    iconId: "lucide:book",
    description: "",
    targetValue: 10,
    unit: "km",
    currentValue: 5,
    complete: false,
    categories: {},
    motivation: "",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-06-30"),
    xpReward: 10,
    status: "IN_PROGRESS",
    term: "SHORT_TERM",
    parentId: "goal-1",
    ...over,
  });

  it("shows the sub-goal count chip and the rows behind the chevron", () => {
    const kids = [child("c1"), child("c2", { currentValue: 10, complete: true, status: "COMPLETED" })];
    const all = [{ ...baseProps, name: baseProps.title, targetValue: 100, currentValue: 0, parentId: null }, ...kids];
    renderWithProviders(
      <GoalBox {...baseProps} targetValue={100} currentValue={0} subGoals={kids} allGoals={all as never} />
    );

    // 1 of 2 done, no rows until the list is opened.
    expect(screen.getByText("SubGoalsCount")).toBeInTheDocument();
    expect(screen.queryByTestId("subgoal-row-c1")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /SubGoals/ }));
    expect(screen.getByTestId("subgoal-row-c1")).toBeInTheDocument();
    expect(screen.getByText("Child c1")).toBeInTheDocument();
    // The one still open gets a plus; the done one gets nothing to press.
    expect(screen.getByRole("button", { name: "Increase: Child c1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Increase: Child c2" })).toBeNull();
    // Half done overall: the parent is not nudged to complete yet.
    expect(screen.queryByTestId("subgoals-done-goal-1")).toBeNull();
  });

  it("nudges to complete the parent once every sub-goal is done", () => {
    const kids = [child("c1", { currentValue: 10, complete: true, status: "COMPLETED" })];
    const all = [{ ...baseProps, name: baseProps.title, targetValue: 100, currentValue: 40, parentId: null }, ...kids];
    renderWithProviders(
      <GoalBox {...baseProps} targetValue={100} currentValue={40} subGoals={kids} allGoals={all as never} />
    );

    const nudge = screen.getByTestId("subgoals-done-goal-1");
    expect(nudge).toHaveTextContent("AllSubGoalsDone");
    // The nudge's Complete is the same call the card makes: XP moves there and only there.
    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
  });

  it("offers Add sub-goal only while there is a level left", () => {
    const onAdd = vi.fn();
    const { unmount } = renderWithProviders(
      <GoalBox {...baseProps} targetValue={10} currentValue={1} depth={2} onAddSubGoal={onAdd} />
    );
    fireEvent.click(screen.getByRole("button", { name: "AddSubGoal" }));
    expect(onAdd).toHaveBeenCalledWith("goal-1");
    unmount();

    renderWithProviders(
      <GoalBox {...baseProps} targetValue={10} currentValue={1} depth={3} onAddSubGoal={onAdd} />
    );
    expect(screen.queryByRole("button", { name: "AddSubGoal" })).toBeNull();
  });
});
