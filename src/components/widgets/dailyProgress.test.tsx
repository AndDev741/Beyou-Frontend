import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import DailyProgress from "./dailyProgress";

vi.mock("chart.js", () => {
    function MockChart(this: any) {
        this.destroy = vi.fn();
    }
    MockChart.register = vi.fn();
    return {
        Chart: MockChart,
        ArcElement: {},
        Tooltip: {},
        Legend: {},
        DoughnutController: {}
    };
});

test("renders a progress ring with the completion percentage", () => {
    render(<DailyProgress checked={3} total={7} />);
    expect(screen.getByText("43%")).toBeInTheDocument();
});

test("renders 0% when total is zero (no division by zero)", () => {
    render(<DailyProgress checked={0} total={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
});
