import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import CategoriesStep from "./CategoriesStep";

describe("CategoriesStep", () => {
  test("selecting chips and adding a custom name builds the selection", () => {
    const onContinue = vi.fn();
    render(<CategoriesStep onContinue={onContinue} loading={false} />);

    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingCatHealth" }));
    const input = screen.getByPlaceholderText("AiOnboardingCategoriesPlaceholder");
    fireEvent.change(input, { target: { value: "Chess" } });
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingAdd" }));
    fireEvent.click(screen.getByRole("button", { name: "AiOnboardingContinue" }));

    expect(onContinue).toHaveBeenCalledWith(["AiOnboardingCatHealth", "Chess"]);
  });

  test("continue disabled with no selection", () => {
    render(<CategoriesStep onContinue={vi.fn()} loading={false} />);
    expect(screen.getByRole("button", { name: "AiOnboardingContinue" })).toBeDisabled();
  });
});
