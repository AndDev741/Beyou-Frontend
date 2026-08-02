import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import DailyProgress from "./dailyProgress";

test("renders a progress ring with the completion percentage", () => {
    renderWithProviders(<DailyProgress checked={3} total={7} />);
    expect(screen.getByText("43%")).toBeInTheDocument();
});

test("renders 0% when total is zero (no division by zero)", () => {
    renderWithProviders(<DailyProgress checked={0} total={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
});

test("shows how many items are done next to the ring", () => {
    const { container } = renderWithProviders(<DailyProgress checked={6} total={13} />);
    expect(container.textContent).toContain("6");
    expect(container.textContent).toContain("13");
    expect(screen.getByText("46%")).toBeInTheDocument();
});
