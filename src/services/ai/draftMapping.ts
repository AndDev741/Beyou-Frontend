import { v4 as uuidv4 } from "uuid";
import { RoutineSection } from "../../types/routine/routineSection";
import { RoutineDraft } from "../../types/ai/routineDraft";
import { MaterializeResponse } from "../../types/ai/materialize";

/**
 * Current form sections → RoutineDraft, used as previousDraft so the AI
 * refines what's already in the form (every item is an existing-id ref).
 */
export const sectionsToDraft = (name: string, sections: RoutineSection[]): RoutineDraft => ({
    name: name || "Routine",
    iconId: undefined,
    newCategories: [],
    sections: sections.map((section) => ({
        name: section.name,
        iconId: section.iconId || undefined,
        startTime: section.startTime,
        endTime: section.endTime || null,
        habits: (section.habitGroup ?? []).map((group) => ({
            existingHabitId: group.habitId,
            newHabit: null,
            startTime: group.startTime || null,
            endTime: group.endTime || null
        })),
        tasks: (section.taskGroup ?? []).map((group) => ({
            existingTaskId: group.taskId,
            newTask: null,
            startTime: group.startTime || null,
            endTime: group.endTime || null
        }))
    }))
});

/**
 * Materialize response → RoutineSection[] for the form. Sections get fresh
 * uuids (drag-and-drop keys; dropped on create, treated as new on edit).
 * Groups carry no id so the backend creates them.
 */
export const materializeToSections = (response: MaterializeResponse): RoutineSection[] =>
    response.sections.map((section, index) => ({
        id: uuidv4(),
        name: section.name,
        iconId: section.iconId || "",
        startTime: section.startTime,
        endTime: section.endTime || "",
        order: index,
        favorite: false,
        habitGroup: section.habitGroup.map((group) => ({
            habitId: group.habitId,
            startTime: group.startTime || "",
            endTime: group.endTime || undefined
        })),
        taskGroup: section.taskGroup.map((group) => ({
            taskId: group.taskId,
            startTime: group.startTime || "",
            endTime: group.endTime || undefined
        }))
    }));
