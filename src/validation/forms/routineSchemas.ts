import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax } from "../common";
import { getItemTimeErrorKeys, getSectionErrorKeys } from "../../components/routines/dailyRoutine/routineValidation";
import type { RoutineSection } from "../../types/routine/routineSection";

export const routineSectionSchema = (t: TFunction) =>
    z.object({
        id: z.string().optional(),
        name: z.string().trim().min(1, t("RoutineSectionNameRequired")),
        startTime: z.string().min(1, t("RoutineSectionStartRequired")),
        endTime: z.string().optional(),
        iconId: z.string().optional(),
        taskGroup: z.array(z.any()).optional(),
        habitGroup: z.array(z.any()).optional(),
        order: z.number().optional(),
        favorite: z.boolean().optional()
    });

export const routineFormSchema = (t: TFunction) =>
    z
        .object({
            routineName: requiredStringWithMinMax(t, {
                requiredKey: "YupNameRequired",
                minKey: "YupMinimumName",
                maxKey: "YupMaxName",
                min: 2,
                max: 256
            }),
            routineSections: z
                .array(routineSectionSchema(t))
                .min(1, t("At least, 1 section need to be created"))
        })
        .superRefine((values, ctx) => {
            const sections = values.routineSections as RoutineSection[];
            for (const section of sections) {
                const sectionErrors = getSectionErrorKeys(section.name, section.startTime);
                if (sectionErrors.length > 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t(sectionErrors[0])
                    });
                    return;
                }
                const taskGroups = section.taskGroup || [];
                for (const taskGroup of taskGroups) {
                    const itemErrors = getItemTimeErrorKeys(
                        section.startTime,
                        section.endTime,
                        taskGroup.startTime,
                        taskGroup.endTime
                    );
                    if (itemErrors.length > 0) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t(itemErrors[0])
                        });
                        return;
                    }
                }
                const habitGroups = section.habitGroup || [];
                for (const habitGroup of habitGroups) {
                    const itemErrors = getItemTimeErrorKeys(
                        section.startTime,
                        section.endTime,
                        habitGroup.startTime,
                        habitGroup.endTime
                    );
                    if (itemErrors.length > 0) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t(itemErrors[0])
                        });
                        return;
                    }
                }
            }
        });
