import { render, screen } from "@testing-library/react";
import XpSparkline from "./XpSparkline";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key })
}));

const bars = (container: HTMLElement) => Array.from(container.querySelectorAll("rect"));
const heightOf = (bar: Element) => Number(bar.getAttribute("height"));

/**
 * The chart the redesign asked for and the API could not answer, so `betterArea`
 * carried a comment instead of bars: the mockup put a week here, the API returned a
 * running total, and the component was written to degrade rather than invent a series.
 */
describe("XpSparkline", () => {
    it("draws one bar per day", () => {
        const { container } = render(<XpSparkline values={[1, 2, 3, 4, 5, 6, 7]} />);

        expect(bars(container)).toHaveLength(7);
    });

    /** "Which day was the good one" is the question, so the tallest day is the ceiling. */
    it("scales to its own best day, not to a fixed ceiling", () => {
        const { container: small } = render(<XpSparkline values={[0, 0, 5]} />);
        const { container: large } = render(<XpSparkline values={[0, 0, 500]} />);

        const tallestSmall = heightOf(bars(small)[2]);
        const tallestLarge = heightOf(bars(large)[2]);

        // A category earning 5 a day and one earning 500 both get a readable shape.
        expect(tallestSmall).toBe(tallestLarge);
        expect(tallestSmall).toBeGreaterThan(heightOf(bars(small)[0]));
    });

    /**
     * Zero is an answer — it says nothing happened that day. An absent bar reads as
     * missing data, which is the confusion the streak strip's legend exists to prevent.
     */
    it("still draws a day where nothing happened", () => {
        const { container } = render(<XpSparkline values={[0, 0, 10]} />);

        expect(bars(container)).toHaveLength(3);
        expect(heightOf(bars(container)[0])).toBeGreaterThan(0);
    });

    /** The mockup highlights the last bar: today is the one you are still writing. */
    it("marks today apart from the days before it", () => {
        const { container } = render(<XpSparkline values={[3, 3, 3]} tone="good" />);

        const drawn = bars(container);
        expect(drawn[2].getAttribute("class")).not.toBe(drawn[0].getAttribute("class"));
        expect(drawn[2].getAttribute("class")).toContain("fill-success");
    });

    it("takes the tone the redesign assigned to each series", () => {
        const { container: warm } = render(<XpSparkline values={[1]} tone="warm" />);
        expect(bars(warm)[0].getAttribute("class")).toContain("fill-flame");
    });

    /**
     * A day can go negative when a check-in is undone. The axis is "how much that day",
     * so it floors at nothing rather than drawing below the baseline.
     */
    it("does not draw a returned day below the floor", () => {
        const { container } = render(<XpSparkline values={[-20, 10]} />);

        const [returned] = bars(container);
        expect(Number(returned.getAttribute("y"))).toBeLessThanOrEqual(46);
        expect(heightOf(returned)).toBeGreaterThan(0);
    });

    it("renders nothing at all when there is no window", () => {
        const { container } = render(<XpSparkline values={[]} />);

        expect(container.querySelector("svg")).toBeNull();
    });

    it("describes itself for anyone who cannot see it", () => {
        render(<XpSparkline values={[1, 2]} summary="Health: XP over the last 2 days" />);

        expect(screen.getByRole("img", { name: "Health: XP over the last 2 days" })).toBeInTheDocument();
    });
});
