import { fireEvent, render, screen } from "@testing-library/react";
import XpSparkline from "./XpSparkline";

vi.mock("react-i18next", () => ({
    // `i18n` too: the per-bar label formats its day in the user's locale.
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en-GB" } })
}));

const bars = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>('[data-testid="xp-bar"]'));

/** Height as the percentage of the tallest day the component wrote inline. */
const heightOf = (bar: HTMLElement) => Number.parseFloat(bar.style.height);

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

    /**
     * The mockup highlights the last bar: today is the one you are still writing. It
     * does it with `opacity: .8` against `1`, which is meant to be barely there — the
     * days before today are not less real than today, and an earlier version at 35%
     * turned the week into "the past, greyed out".
     */
    it("marks today by brightness, in the same colour as the rest of the week", () => {
        const { container } = render(<XpSparkline values={[3, 3, 3]} tone="good" />);

        const drawn = bars(container);
        expect(drawn[0].className).toContain("bg-success/80");
        expect(drawn[2].className).toContain("bg-success");
        expect(drawn[2].className).not.toContain("bg-success/80");
    });

    it("takes the tone the redesign assigned to each series", () => {
        const { container: warm } = render(<XpSparkline values={[1]} tone="warm" />);
        expect(bars(warm)[0].className).toContain("bg-flame");
    });

    /**
     * A day can go negative when a check-in is undone. The axis is "how much that day",
     * so it floors at nothing rather than drawing below the baseline.
     */
    it("does not draw a returned day below the floor", () => {
        const { container } = render(<XpSparkline values={[-20, 10]} />);

        const [returned, earned] = bars(container);
        expect(heightOf(returned)).toBeGreaterThan(0);
        expect(heightOf(returned)).toBeLessThan(heightOf(earned));
    });

    it("renders nothing at all when there is no window", () => {
        const { container } = render(<XpSparkline values={[]} />);

        expect(bars(container)).toHaveLength(0);
        expect(container.firstChild).toBeNull();
    });

    /**
     * The reason this is elements and not the mockup's SVG. A fixed viewBox scales
     * everything by the width it is handed: on a category card the 7px axis labels came
     * out larger than the card's own title. Type that stays type is the whole point, so
     * the size prop changes the plot's height and nothing about how the chart is built.
     */
    it("changes size without changing anything else", () => {
        const { container: small } = render(<XpSparkline values={[1, 2, 3]} size="sm" />);
        const { container: medium } = render(<XpSparkline values={[1, 2, 3]} size="md" />);

        expect(bars(small)).toHaveLength(bars(medium).length);
        expect(heightOf(bars(small)[2])).toBe(heightOf(bars(medium)[2]));
        expect(small.querySelector(".h-9")).not.toBeNull();
        expect(medium.querySelector(".h-14")).not.toBeNull();
    });

    it("describes itself for anyone who cannot see it", () => {
        render(<XpSparkline values={[1, 2]} summary="Health: XP over the last 2 days" />);

        expect(screen.getByRole("img", { name: "Health: XP over the last 2 days" })).toBeInTheDocument();
    });

    /**
     * Hover is the desktop half and CSS alone. A phone never hovers, so a tap has to
     * hold the label open — and making the bar a button gets the third audience for
     * free: it is focusable, so the number arrives by keyboard and is announced rather
     * than living only in a hover state no screen reader will ever enter.
     */
    describe("reading one day's number", () => {
        it("names the day and its XP on every bar", () => {
            const { container } = render(
                <XpSparkline values={[4, 12]} days={["2026-08-14", "2026-08-15"]} />
            );

            expect(bars(container)[1].getAttribute("aria-label")).toContain("12 XP");
        });

        it("falls back to the XP alone when no days came with the series", () => {
            const { container } = render(<XpSparkline values={[7]} />);

            expect(bars(container)[0].getAttribute("aria-label")).toBe("7 XP");
        });

        /**
         * `new Date("2026-08-15")` is UTC midnight, which west of Greenwich renders as
         * the 14th — every bar would be labelled with yesterday.
         */
        it("reads the day as local, not as UTC midnight", () => {
            const { container } = render(
                <XpSparkline values={[1]} days={["2026-08-15"]} />
            );

            expect(bars(container)[0].getAttribute("aria-label")).toContain("15");
        });

        it("holds the label open on a tap and lets a second tap close it", () => {
            const { container } = render(<XpSparkline values={[4, 12]} />);
            const [first] = bars(container);
            const labelOf = (bar: HTMLElement) => bar.querySelector("span")!;

            expect(labelOf(first).className).toContain("opacity-0");

            fireEvent.click(first);
            expect(labelOf(first).className).toContain("opacity-100");
            expect(labelOf(first).className).not.toContain("opacity-0");

            fireEvent.click(first);
            expect(labelOf(first).className).toContain("opacity-0");
        });

        it("moves the label to whichever bar was tapped last", () => {
            const { container } = render(<XpSparkline values={[4, 12]} />);
            const [first, second] = bars(container);
            const labelOf = (bar: HTMLElement) => bar.querySelector("span")!;

            fireEvent.click(first);
            fireEvent.click(second);

            expect(labelOf(second).className).toContain("opacity-100");
            expect(labelOf(first).className).toContain("opacity-0");
        });
    });
});
