import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax, stringMax } from "../common";

export const taskFormSchema = (t: TFunction) =>
    z
        .object({
            name: requiredStringWithMinMax(t, {
                requiredKey: "YupNameRequired",
                minKey: "YupMinimumName",
                maxKey: "YupMaxName",
                min: 2,
                max: 256
            }),
            description: stringMax(t, 256, "YupDescriptionMaxValue"),
            iconId: z.string().min(1, t("YupIconRequired")),
            importance: z.number(),
            difficulty: z.number(),
            categoriesId: z.array(z.string()),
            oneTimeTask: z.boolean().default(false)
        })
        .superRefine((values, ctx) => {
            const { importance, difficulty } = values;
            const bothSet =
                (importance !== 0 && difficulty !== 0) ||
                (importance === 0 && difficulty === 0);
            if (!bothSet) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t("Importance and Difficulty must be set together"),
                    path: ["importance"]
                });
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t("Importance and Difficulty must be set together"),
                    path: ["difficulty"]
                });
            }
        });
