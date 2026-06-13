import { renderWithProviders } from "../../../test/test-utils";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import CreateRoutineWithAi from "./CreateRoutineWithAi";
import { RoutineDraft } from "../../../types/ai/routineDraft";
import { MaterializeResponse } from "../../../types/ai/materialize";
import { RoutineSection } from "../../../types/routine/routineSection";

// vite.config.ts sets mockReset: true — factory implementations are wiped
// before each test, so behaviors are configured per-test below.
vi.mock("../../../services/ai/generateRoutine", () => ({ default: vi.fn() }));
vi.mock("../../../services/ai/materializeRoutine", () => ({ default: vi.fn() }));
vi.mock("../../../services/habits/getHabits", () => ({ default: vi.fn() }));
vi.mock("../../../services/tasks/getTasks", () => ({ default: vi.fn() }));
vi.mock("../../../services/categories/getCategories", () => ({ default: vi.fn() }));

import generateRoutine from "../../../services/ai/generateRoutine";
import materializeRoutine from "../../../services/ai/materializeRoutine";
import getHabits from "../../../services/habits/getHabits";
import getTasks from "../../../services/tasks/getTasks";
import getCategories from "../../../services/categories/getCategories";

const generatedDraft: RoutineDraft = {
    name: "AI Morning Routine",
    newCategories: [],
    sections: [{
        name: "Morning", startTime: "06:00", endTime: "09:00",
        habits: [{ newHabit: { name: "Drink water", importance: 3, dificulty: 1, categoryRefs: [] } }],
        tasks: []
    }]
};

const materialized: MaterializeResponse = {
    name: "AI Morning Routine",
    iconId: "ri:md/MdWbSunny",
    scheduleDays: null,
    sections: [{
        name: "Morning", iconId: "ri:md/MdWbSunny", startTime: "06:00", endTime: "09:00",
        habitGroup: [{ habitId: "new-habit-1", startTime: "06:00", endTime: "06:10" }],
        taskGroup: []
    }],
    newCategoryIds: [],
    newHabitIds: ["new-habit-1"],
    newTaskIds: []
};

const wireSuccess = () => {
    vi.mocked(generateRoutine).mockResolvedValue({ success: { draft: generatedDraft } });
    vi.mocked(materializeRoutine).mockResolvedValue({ success: materialized });
    vi.mocked(getHabits).mockResolvedValue({ success: [] });
    vi.mocked(getTasks).mockResolvedValue({ success: [] });
    vi.mocked(getCategories).mockResolvedValue({ success: [] });
};

test("describe → generate → materialize → applies sections + new ids to the form", async () => {
    wireSuccess();
    let applied: { name: string; sections: RoutineSection[]; newItemIds: string[] } | null = null;
    const onClose = vi.fn();

    renderWithProviders(
        <CreateRoutineWithAi
            currentName=""
            currentSections={[]}
            onApply={(name, sections, newItemIds) => { applied = { name, sections, newItemIds }; }}
            onClose={onClose}
        />
    );

    fireEvent.change(screen.getByTestId("ai-description"), {
        target: { value: "I wake up at 6am and want a healthy morning routine" }
    });
    fireEvent.click(screen.getByTestId("ai-generate"));

    await waitFor(() => expect(materializeRoutine).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(applied).not.toBeNull();
    expect(applied!.name).toBe("AI Morning Routine");
    expect(applied!.sections).toHaveLength(1);
    expect(applied!.sections[0].habitGroup![0].habitId).toBe("new-habit-1");
    expect(applied!.sections[0].id).toBeTruthy(); // synthetic uuid for drag key
    expect(applied!.newItemIds).toEqual(["new-habit-1"]);
    // first call has no previousDraft (form was empty)
    expect(vi.mocked(generateRoutine).mock.calls[0][0].previousDraft).toBeUndefined();
});

test("with existing form sections, sends them as previousDraft (refine mode)", async () => {
    wireSuccess();
    const currentSections: RoutineSection[] = [{
        id: "s1", name: "Morning", iconId: "", startTime: "06:00", endTime: "09:00",
        habitGroup: [{ habitId: "h1", startTime: "06:00", endTime: "06:30" }],
        taskGroup: [], order: 0
    }];

    renderWithProviders(
        <CreateRoutineWithAi
            currentName="My Routine"
            currentSections={currentSections}
            onApply={() => {}}
            onClose={() => {}}
        />
    );

    fireEvent.change(screen.getByTestId("ai-description"), { target: { value: "make the morning lighter please" } });
    fireEvent.click(screen.getByTestId("ai-generate"));

    await waitFor(() => expect(generateRoutine).toHaveBeenCalled());
    const payload = vi.mocked(generateRoutine).mock.calls[0][0];
    expect(payload.previousDraft?.name).toBe("My Routine");
    expect(payload.previousDraft?.sections[0].habits[0].existingHabitId).toBe("h1");
    expect(payload.feedback).toBe("make the morning lighter please");
});

test("short description shows validation error and does not call the service", () => {
    renderWithProviders(
        <CreateRoutineWithAi currentName="" currentSections={[]} onApply={() => {}} onClose={() => {}} />
    );

    fireEvent.change(screen.getByTestId("ai-description"), { target: { value: "short" } });
    fireEvent.click(screen.getByTestId("ai-generate"));

    expect(screen.getByText("DescriptionTooShort")).toBeInTheDocument();
    expect(generateRoutine).not.toHaveBeenCalled();
});

test("generation failure returns to describe step without applying", async () => {
    vi.mocked(generateRoutine).mockResolvedValue({ error: { errorKey: "AI_GENERATION_FAILED" } });
    const onApply = vi.fn();

    renderWithProviders(
        <CreateRoutineWithAi currentName="" currentSections={[]} onApply={onApply} onClose={() => {}} />
    );

    fireEvent.change(screen.getByTestId("ai-description"), {
        target: { value: "I wake up at 6am and want a healthy morning routine" }
    });
    fireEvent.click(screen.getByTestId("ai-generate"));

    expect(await screen.findByTestId("ai-description")).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
    expect(materializeRoutine).not.toHaveBeenCalled();
});
