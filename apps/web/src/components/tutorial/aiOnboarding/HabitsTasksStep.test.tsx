import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import HabitsTasksStep from "./HabitsTasksStep";

const habit = { name: "Run", description: "d", motivationalPhrase: "", iconId: "lucide:zap",
  categoryName: "Health", importance: 3, difficulty: 2 };
const task = { name: "Buy shoes", description: "d", iconId: "lucide:zap",
  categoryName: "Health", importance: 2, difficulty: 1 };

describe("HabitsTasksStep", () => {
  test("select-all selects every habit card; continue reports selection", () => {
    const onContinue = vi.fn();
    render(<HabitsTasksStep categories={[{ id: "c", name: "Health" }]}
      initial={{ habits: [habit], tasks: [task] }} loading={false}
      fetchMore={vi.fn()} onContinue={onContinue} />);

    fireEvent.click(screen.getAllByRole("button", { name: "AiOnboardingSelectAll" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingContinue" }));

    expect(onContinue).toHaveBeenCalledWith({ habits: [habit], tasks: [], freeTexts: [] });
  });

  test("free input appends fetched items pre-selected", async () => {
    const fetchMore = vi.fn().mockResolvedValue({ habits: [{ ...habit, name: "Meditate" }], tasks: [] });
    render(<HabitsTasksStep categories={[{ id: "c", name: "Health" }]}
      initial={{ habits: [habit], tasks: [] }} loading={false}
      fetchMore={fetchMore} onContinue={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("AiOnboardingFreeInputPlaceholder"),
      { target: { value: "something calm" } });
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingAdd" }));

    expect(fetchMore).toHaveBeenCalledWith("something calm");
    expect(await screen.findByText("Meditate")).toBeInTheDocument();
  });
});
