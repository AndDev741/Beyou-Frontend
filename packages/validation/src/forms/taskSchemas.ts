import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax, stringMax } from "../common";

/**
 * Importance and difficulty are OPTIONAL on a task, each on its own. The form holds
 * "unset" as 0 (a segmented control with nothing chosen); the api layer turns 0 into
 * null on the wire, and the server counts a missing value as 1 for XP. A value that IS
 * chosen still has to sit in 1..5.
 *
 * They used to be `min(1)` behind a refine that tried to allow the 0/0 pair — dead code,
 * since `min(1)` had already rejected the 0. Both clients seeded the form with 0 and
 * were blocked with an untranslated zod message. That was the "tasks force a priority"
 * bug on the kanban.
 */
export const optionalPriority = (t: TFunction, maxKey: string) =>
    z.number().int().min(0, t(maxKey)).max(5, t(maxKey));

// Text maxes mirror the tasks table: name and description are varchar(255).
export const taskFormSchema = (t: TFunction) =>
    z.object({
        name: requiredStringWithMinMax(t, {
            requiredKey: "YupNameRequired",
            minKey: "YupMinimumName",
            maxKey: "YupMaxName",
            min: 2,
            max: 255
        }),
        description: stringMax(t, 255, "YupDescriptionMaxValue"),
        iconId: z.string().min(1, t("YupIconRequired")),
        importance: optionalPriority(t, "YupMaxImportance"),
        difficulty: optionalPriority(t, "YupMaxDifficulty"),
        categoriesId: z.array(z.string()),
        oneTimeTask: z.boolean().default(false)
    });
