import { sortDraft } from "./sortDraft";
import { RoutineDraft } from "@beyou/types/ai/routineDraft";

test("sorts sections and items chronologically by startTime", () => {
    const draft: RoutineDraft = {
        name: "R",
        newCategories: [],
        sections: [
            {
                name: "Night", startTime: "21:00", endTime: "22:00",
                habits: [
                    { existingHabitId: "h2", startTime: "21:30" },
                    { existingHabitId: "h1", startTime: "21:00" }
                ],
                tasks: [{ existingTaskId: "t1", startTime: "21:15" }]
            },
            { name: "Morning", startTime: "06:00", endTime: "09:00", habits: [], tasks: [] }
        ]
    };

    const sorted = sortDraft(draft);

    expect(sorted.sections.map((s) => s.name)).toEqual(["Morning", "Night"]);
    expect(sorted.sections[1].habits.map((h) => h.existingHabitId)).toEqual(["h1", "h2"]);
    // original draft untouched (immutability)
    expect(draft.sections[0].name).toBe("Night");
});

test("items without startTime sink to the end", () => {
    const draft: RoutineDraft = {
        name: "R",
        newCategories: [],
        sections: [{
            name: "S", startTime: "06:00",
            habits: [
                { existingHabitId: "noTime", startTime: null },
                { existingHabitId: "timed", startTime: "06:10" }
            ],
            tasks: []
        }]
    };

    expect(sortDraft(draft).sections[0].habits.map((h) => h.existingHabitId)).toEqual(["timed", "noTime"]);
});
