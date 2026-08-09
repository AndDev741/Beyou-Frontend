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

// O i18n do ambiente de teste devolve a própria chave, então a asserção é
// sobre qual chave a cadência escolhe — que é a lógica em jogo.
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
