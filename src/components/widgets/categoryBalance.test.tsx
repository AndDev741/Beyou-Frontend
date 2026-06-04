import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import CategoryBalance from "./categoryBalance";

vi.mock("chart.js", () => {
    function MockChart(this: any) { this.destroy = vi.fn(); }
    (MockChart as any).register = vi.fn();
    return { Chart: MockChart, RadialLinearScale: {}, PointElement: {}, LineElement: {}, Filler: {}, Tooltip: {} };
});

const cat = (name: string, xp: number) => ({
    id: name, iconId: "i", name, xp, actualLevelXp: 0, nextLevelXp: 100, level: 1, description: "", createdAt: new Date()
});

test("shows fallback with fewer than 3 categories", () => {
    render(<CategoryBalance categories={[cat("Health", 10), cat("Work", 20)] as any} />);
    expect(screen.getByTestId("category-balance-fallback")).toBeInTheDocument();
});

test("renders the radar chart with 3+ categories", () => {
    render(<CategoryBalance categories={[cat("Health", 10), cat("Work", 20), cat("Mind", 30)] as any} />);
    expect(screen.getByTestId("category-balance-chart")).toBeInTheDocument();
});
