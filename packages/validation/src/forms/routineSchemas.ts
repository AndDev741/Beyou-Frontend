import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax } from "../common";
import { getItemTimeErrorKeys, getSectionErrorKeys } from "../routineValidation";
import type { RoutineSection } from "@beyou/types/routine/routineSection";

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

/**
 * A LIST routine's form: a name and at least one entry, and nothing about time.
 *
 * Separate from routineFormSchema rather than a branch inside it because the two forms hold
 * genuinely different state — one an array of sections, the other a flat array of picked
 * habits and tasks — and a schema that had to accept both would validate neither properly.
 */
export const routineListItemSchema = (t: TFunction) =>
    z
        .object({
            /** The item group id, present only when editing an entry that already exists. */
            id: z.string().optional(),
            type: z.enum(["HABIT", "TASK"]),
            habitId: z.string().optional().nullable(),
            taskId: z.string().optional().nullable()
        })
        .refine((item) => (item.type === "HABIT" ? Boolean(item.habitId) : Boolean(item.taskId)), {
            message: t("RoutineItemAmbiguous")
        });

export const routineListFormSchema = (t: TFunction) =>
    z.object({
        routineName: requiredStringWithMinMax(t, {
            requiredKey: "YupNameRequired",
            minKey: "YupMinimumName",
            maxKey: "YupMaxName",
            min: 2,
            max: 255
        }),
        items: z.array(routineListItemSchema(t)).min(1, t("AtLeastOneItemRequired"))
    });

// routines.name is varchar(255); habit/category names elsewhere allow 256.
export const routineFormSchema = (t: TFunction) =>
    z
        .object({
            routineName: requiredStringWithMinMax(t, {
                requiredKey: "YupNameRequired",
                minKey: "YupMinimumName",
                maxKey: "YupMaxName",
                min: 2,
                max: 255
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
                        path: ["routineSections"],
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
                            path: ["routineSections"],
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
                            path: ["routineSections"],
                            message: t(itemErrors[0])
                        });
                        return;
                    }
                }
            }
        });
