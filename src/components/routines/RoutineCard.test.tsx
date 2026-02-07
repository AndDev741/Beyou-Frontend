import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import { RoutineCard } from "./RoutineCard";
import { Routine } from "../../types/routine/routine";
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
            onRequestDelete={vi.fn()}
            onConfirmDelete={vi.fn()}
            onCancelDelete={vi.fn()}
            isConfirmingDelete={false}
        />
    );

    const expandButton = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandButton);

    expect(screen.getByText("08:00 - 09:00")).toBeInTheDocument();
});
