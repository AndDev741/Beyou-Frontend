import { sectionsToDraft, materializeToSections } from "./draftMapping";
import { RoutineSection } from "@beyou/types/routine/routineSection";
import { MaterializeResponse } from "@beyou/types/ai/materialize";

test("sectionsToDraft turns form sections into existing-id references", () => {
    const sections: RoutineSection[] = [{
        id: "s1", name: "Morning", iconId: "ic", startTime: "06:00", endTime: "09:00",
        habitGroup: [{ habitId: "h1", startTime: "06:00", endTime: "06:30" }],
        taskGroup: [{ taskId: "t1", startTime: "07:00" }],
        order: 0
    }];

    const draft = sectionsToDraft("My Routine", sections);

    expect(draft.name).toBe("My Routine");
    expect(draft.newCategories).toEqual([]);
    expect(draft.sections[0].habits[0].existingHabitId).toBe("h1");
    expect(draft.sections[0].habits[0].newHabit).toBeNull();
    expect(draft.sections[0].tasks[0].existingTaskId).toBe("t1");
});

test("materializeToSections maps refs into form sections with synthetic ids", () => {
    const response: MaterializeResponse = {
        name: "R", iconId: "ic", scheduleDays: null,
        sections: [{
            name: "Morning", iconId: "ic", startTime: "06:00", endTime: "09:00",
            habitGroup: [{ habitId: "h1", startTime: "06:00", endTime: "06:10" }],
            taskGroup: [{ taskId: "t1", startTime: "07:00", endTime: null }]
        }],
        newCategoryIds: [], newHabitIds: ["h1"], newTaskIds: []
    };

    const sections = materializeToSections(response);

    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBeTruthy();
    expect(sections[0].order).toBe(0);
    expect(sections[0].habitGroup![0].habitId).toBe("h1");
    expect(sections[0].taskGroup![0].taskId).toBe("t1");
    // no group ids — backend treats them as new groups
    expect(sections[0].habitGroup![0]).not.toHaveProperty("id");
});
