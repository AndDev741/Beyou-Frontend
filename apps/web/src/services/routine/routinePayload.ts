import { Routine } from "../../types/routine/routine";

type BuildOptions = {
    includeSectionIds: boolean;
    includeGroupIds: boolean;
};

export const buildRoutinePayload = (routine: Routine, options: BuildOptions) => ({
    name: routine.name,
    iconId: routine.iconId,
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
});
