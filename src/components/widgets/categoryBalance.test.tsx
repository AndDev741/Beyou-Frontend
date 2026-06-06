import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import CategoryBalance, { toHex6 } from "./categoryBalance";

vi.mock("chart.js", () => {
    function MockChart(this: any) { this.destroy = vi.fn(); }
    (MockChart as any).register = vi.fn();
    return {
        Chart: MockChart,
        RadarController: { id: "radar" },
        RadialLinearScale: {},
        PointElement: {},
        LineElement: {},
        Filler: {},
        Tooltip: {}
    };
});

const cat = (name: string, xp: number) => ({
    id: name, iconId: "i", name, xp, actualLevelXp: 0, nextLevelXp: 100, level: 1, description: "", createdAt: new Date()
});

test("registers the radar controller with chart.js (a chart type without its controller crashes at runtime)", async () => {
    // Module-scope Chart.register runs on import, but the project's mockReset
    // wipes recorded calls between tests — re-import fresh modules to observe it.
    vi.resetModules();
    const freshChartModule: any = await import("chart.js");
    await import("./categoryBalance");
    const registeredArgs = freshChartModule.Chart.register.mock.calls.flat();
    expect(registeredArgs).toContain(freshChartModule.RadarController);
});

test("toHex6 strips alpha channel from 8-digit hex", () => {
    expect(toHex6("#947347ff")).toBe("#947347");
    expect(toHex6("#0082E1FF")).toBe("#0082E1");
});

test("toHex6 passes 6-digit hex through unchanged", () => {
    expect(toHex6("#0082E1")).toBe("#0082E1");
    expect(toHex6("#947347")).toBe("#947347");
});

test("shows fallback with fewer than 3 categories", () => {
    render(<CategoryBalance categories={[cat("Health", 10), cat("Work", 20)] as any} />);
    expect(screen.getByTestId("category-balance-fallback")).toBeInTheDocument();
});

test("renders the radar chart with 3+ categories", () => {
    render(<CategoryBalance categories={[cat("Health", 10), cat("Work", 20), cat("Mind", 30)] as any} />);
    expect(screen.getByTestId("category-balance-chart")).toBeInTheDocument();
});
