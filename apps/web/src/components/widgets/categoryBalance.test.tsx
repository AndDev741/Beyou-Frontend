import { render, screen } from "@testing-library/react";
import CategoryBalance, { toHex6 } from "./categoryBalance";

const cat = (name: string, xp: number) => ({
    id: name, iconId: "i", name, xp, actualLevelXp: 0, nextLevelXp: 100, level: 1, description: "", createdAt: new Date()
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

// The radar is SVG (not canvas) precisely so it can follow the theme and accent
// pack: canvas cannot resolve a CSS var. These cases lock in the geometry.
test("draws one axis label per category, capped at six", () => {
    const many = ["A", "B", "C", "D", "E", "F", "G"].map((n, i) => cat(n, 10 * (i + 1)));
    render(<CategoryBalance categories={many as any} />);
    expect(screen.getAllByText(/^[A-F]$/)).toHaveLength(6);
});

test("scales the series against the strongest category, not an absolute maximum", () => {
    const { container } = render(
        <CategoryBalance categories={[cat("Health", 10), cat("Work", 20), cat("Mind", 100)] as any} />,
    );
    const series = container.querySelectorAll("polygon")[2];
    const distances = series
        .getAttribute("points")!
        .split(" ")
        .map((pair) => {
            const [x, y] = pair.split(",").map(Number);
            return Math.hypot(x - 60, y - 60);
        });
    // The highest-XP axis touches the edge (radius 46); the others stay proportional.
    expect(Math.max(...distances)).toBeCloseTo(42, 0);
    expect(Math.min(...distances)).toBeLessThan(42);
});

test("keeps a zero-XP category visible instead of collapsing it into the centre", () => {
    const { container } = render(
        <CategoryBalance categories={[cat("Health", 0), cat("Work", 20), cat("Mind", 100)] as any} />,
    );
    const series = container.querySelectorAll("polygon")[2];
    expect(series.getAttribute("points")).not.toMatch(/\b60\.0,60\.0\b/);
});
