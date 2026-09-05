import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax, stringMax, requiredNumber, stringDateRequired } from "../common";

// Text maxes mirror the goals table: name, description and motivation are varchar(255).
export const goalFormSchema = (t: TFunction) =>
    z.object({
        title: requiredStringWithMinMax(t, {
            requiredKey: "YupNameRequired",
            minKey: "YupMinimumName",
            maxKey: "YupMaxName",
            min: 2,
            max: 255
        }),
        iconId: z.string().min(1, t("YupIconRequired")),
        description: stringMax(t, 255, "YupDescriptionMaxValue"),
        targetValue: requiredNumber(t, "YupRequiredValue"),
        unit: z.string().min(1, t("YupUnitRequired")),
        currentValue: requiredNumber(t, "YupRequiredValue"),
        categoriesId: z.array(z.string()),
        motivation: stringMax(t, 255, "YupDescriptionMaxValue"),
        startDate: stringDateRequired(t, "YupDateRequired"),
        endDate: stringDateRequired(t, "YupDateRequired"),
        status: z.string().min(1, t("YupStatusRequired")),
        term: z.string().min(1, t("YupTermRequired")),
        // The tree rules (owner, cycle, depth) are the server's; the form only carries the id.
        parentId: z.string().nullable().optional()
    });
