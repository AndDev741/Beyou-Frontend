import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { WeekDay } from "@beyou/types/schedule/weekDay";
import WeekdayPicker from "./WeekdayPicker";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

test("names each square by the whole day, Sunday first", () => {
    render(<WeekdayPicker value={[]} onToggle={() => {}} />);

    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(DAYS);
});

test("marks the selected days as pressed", () => {
    render(<WeekdayPicker value={["Saturday"]} onToggle={() => {}} />);

    expect(screen.getByRole("button", { name: "Saturday" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Friday" })).toHaveAttribute("aria-pressed", "false");
});

test("a press hands the day to the caller, which owns the state", () => {
    const onToggle = vi.fn();
    render(<WeekdayPicker value={[]} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));

    expect(onToggle).toHaveBeenCalledWith("Wednesday");
});

test("toggles on and off when the caller keeps the state", () => {
    function Harness() {
        const [days, setDays] = useState<WeekDay[]>([]);
        return (
            <WeekdayPicker
                value={days}
                onToggle={(day) => setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))}
            />
        );
    }
    render(<Harness />);
    const sunday = screen.getByRole("button", { name: "Sunday" });

    fireEvent.click(sunday);
    expect(sunday).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(sunday);
    expect(sunday).toHaveAttribute("aria-pressed", "false");
});

test("a blocked day takes the caller's tooltip", () => {
    render(
        <WeekdayPicker
            value={[]}
            onToggle={() => {}}
            dayState={(day) => (day === "Monday" ? { blocked: true, title: "Taken by Gym" } : {})}
        />,
    );

    expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("title", "Taken by Gym");
    expect(screen.getByRole("button", { name: "Tuesday" })).toHaveAttribute("title", "Tuesday");
});
