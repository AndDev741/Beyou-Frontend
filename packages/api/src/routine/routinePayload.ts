import { Routine } from "@beyou/types/routine/routine";

type BuildOptions = {
    includeSectionIds: boolean;
    includeGroupIds: boolean;
};

/**
 * The create/update body, in whichever shape the routine is.
 *
 * A LIST routine sends `items` and no sections; a DAILY one sends sections and no items.
 * The backend refuses a request carrying both, deliberately, so this must never hedge and
 * send the two together.
 *
 * Order is position in the array. There is no index field to send, and adding one would only
 * give the client a second way to say the same thing.
 */
export const buildRoutinePayload = (routine: Routine, options: BuildOptions) => {
    // Compared inline rather than through isListRoutine: that helper lives in
    // @beyou/state, which depends on THIS package, so importing it back would be a
    // cycle. Keep the two in step — "no type" means DAILY in both.
    if (routine.type === "LIST") {
        return {
            name: routine.name,
            iconId: routine.iconId,
            type: "LIST",
            items: (routine.items ?? []).map((item) => ({
                // On an edit the id is what keeps the row, and with it every check ever
                // recorded against it. Dropping it silently erases the user's history.
                ...(options.includeGroupIds ? { id: item.id } : {}),
                habitId: item.type === "HABIT" ? item.habitId : null,
                taskId: item.type === "TASK" ? item.taskId : null,
            })),
        };
    }

    return {
        name: routine.name,
        iconId: routine.iconId,
        type: "DAILY",
        routineSections: routine.routineSections.map((section) => ({
            ...(options.includeSectionIds ? { id: section.id } : {}),
            name: section.name,
            iconId: section.iconId,
            startTime: section.startTime,
            endTime: section.endTime,
            taskGroup: section.taskGroup?.map((taskGroup) => ({
                ...(options.includeGroupIds ? { id: taskGroup.id } : {}),
                taskId: taskGroup.taskId,
                startTime: taskGroup.startTime,
                endTime: taskGroup.endTime
            })),
            habitGroup: section.habitGroup?.map((habitGroup) => ({
                ...(options.includeGroupIds ? { id: habitGroup.id } : {}),
                habitId: habitGroup.habitId,
                startTime: habitGroup.startTime,
                endTime: habitGroup.endTime
            })),
            favorite: section.favorite
        }))
    };
};
