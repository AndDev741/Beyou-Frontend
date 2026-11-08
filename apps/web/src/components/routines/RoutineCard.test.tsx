import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import { RoutineCard } from "./RoutineCard";
import { Routine } from "@beyou/types/routine/routine";
import { vi } from "vitest";

const buildRoutine = (): Routine => ({
    id: "routine-1",
    name: "Morning routine",
    iconId: "",
    routineSections: [
        {
            id: "section-1",
            name: "Morning",
            iconId: "",
            startTime: "07:00",
            endTime: "10:00",
            taskGroup: [
                {
                    id: "task-group-1",
                    taskId: "task-1",
                    startTime: "08:00",
                    endTime: "09:00",
                    taskGroupChecks: []
                }
            ],
            habitGroup: [],
            order: 0
        }
    ]
});

test("renders item time range when endTime is provided", () => {
    const routine = buildRoutine();

    renderWithProviders(
        <RoutineCard
            routine={routine}
            selectedDate="2024-01-01"
            taskLookup={{ "task-1": { name: "Test task" } }}
            habitLookup={{}}
            onEdit={vi.fn()}
            onSchedule={vi.fn()}
            onCheckItem={vi.fn()}
            onSkipItem={vi.fn()}
            onRequestDelete={vi.fn()}
        />
    );

    const expandButton = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandButton);

    expect(screen.getByText("08:00 - 09:00")).toBeInTheDocument();
});

const renderCard = (routine: Routine) =>
    renderWithProviders(
        <RoutineCard
            routine={routine}
            selectedDate="2024-01-01"
            taskLookup={{ "task-1": { name: "Test task" } }}
            habitLookup={{}}
            onEdit={vi.fn()}
            onSchedule={vi.fn()}
            onCheckItem={vi.fn()}
            onSkipItem={vi.fn()}
            onRequestDelete={vi.fn()}
        />
    );

test("expands from the title, which is the only affordance on the phone", () => {
    renderCard(buildRoutine());

    const title = screen.getByRole("button", { name: /morning routine/i });
    expect(title).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(title);

    expect(title).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Test task")).toBeInTheDocument();
});

// The test environment's i18n returns the key itself, so the assertion is about
// which key the cadence picks — which is the logic at play.
test("states the cadence next to sections and items", () => {
    const routine = buildRoutine();
    routine.schedule = { days: ["Monday", "Wednesday"] } as Routine["schedule"];

    renderCard(routine);

    const title = screen.getByRole("button", { name: /morning routine/i });
    expect(title.textContent).toContain("DaysPerWeek");
});

test("a routine scheduled every day says so instead of counting days", () => {
    const routine = buildRoutine();
    routine.schedule = {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    } as Routine["schedule"];

    renderCard(routine);

    const title = screen.getByRole("button", { name: /morning routine/i });
    expect(title.textContent).toContain("EveryDay");
    expect(title.textContent).not.toContain("DaysPerWeek");
});

test("checking an item is driven by a real checkbox named after it", () => {
    renderCard(buildRoutine());

    fireEvent.click(screen.getByRole("button", { name: /expand/i }));

    expect(screen.getByRole("checkbox", { name: "Test task" })).toBeInTheDocument();
});

// 2024-01-01 is a Monday, 2024-01-06 a Saturday.
const weekendRoutine = (): Routine => {
    const routine = buildRoutine();
    routine.routineSections[0].habitGroup = [
        { id: "habit-group-1", habitId: "habit-1", startTime: "09:00", endTime: "09:30", habitGroupChecks: [], days: ["Saturday"] },
    ];
    return routine;
};

const renderOn = (routine: Routine, selectedDate: string) =>
    renderWithProviders(
        <RoutineCard
            routine={routine}
            selectedDate={selectedDate}
            taskLookup={{ "task-1": { name: "Test task" } }}
            habitLookup={{ "habit-1": { name: "Clean the tank" } }}
            onEdit={vi.fn()}
            onSchedule={vi.fn()}
            onCheckItem={vi.fn()}
            onSkipItem={vi.fn()}
            onRequestDelete={vi.fn()}
        />
    );

test("an item whose days leave out the open day is dimmed, shows its days and has nothing to press", () => {
    renderOn(weekendRoutine(), "2024-01-01");
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));

    const offDay = screen.getByTestId("off-day-item");
    expect(offDay).toHaveClass("opacity-60");
    expect(offDay).toHaveTextContent("Clean the tank");
    expect(offDay).toHaveTextContent("Sat");
    expect(screen.queryByRole("checkbox", { name: "Clean the tank" })).not.toBeInTheDocument();
    // Only the task that runs on Monday keeps its ring and its skip.
    expect(screen.getByRole("checkbox", { name: "Test task" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Skip" })).toHaveLength(1);
});

test("the off-day item stays out of the day's tally", () => {
    renderOn(weekendRoutine(), "2024-01-01");
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));

    // One item runs on Monday, not two.
    expect(screen.getByText("0/1")).toBeInTheDocument();
    expect(screen.getByText(/07:00 - 10:00 · 0\//).textContent).toContain("0/1");
});

test("on one of its days the item is an ordinary, checkable row", () => {
    renderOn(weekendRoutine(), "2024-01-06");
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));

    expect(screen.queryByTestId("off-day-item")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Clean the tank" })).toBeInTheDocument();
    expect(screen.getByText("0/2")).toBeInTheDocument();
});
