import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax, stringMax, requiredNumber, stringDateRequired } from "../common";

export const goalFormSchema = (t: TFunction) =>
    z.object({
        title: requiredStringWithMinMax(t, {
            requiredKey: "YupNameRequired",
            minKey: "YupMinimumName",
            maxKey: "YupMaxName",
            min: 2,
            max: 256
        }),
        iconId: z.string().min(1, t("YupIconRequired")),
        description: stringMax(t, 256, "YupDescriptionMaxValue"),
        targetValue: requiredNumber(t, "YupRequiredValue"),
        unit: z.string().min(1, t("YupUnitRequired")),
        currentValue: requiredNumber(t, "YupRequiredValue"),
        categoriesId: z.array(z.string()),
        motivation: stringMax(t, 256, "YupDescriptionMaxValue"),
        startDate: stringDateRequired(t, "YupDateRequired"),
        endDate: stringDateRequired(t, "YupDateRequired"),
        status: z.string().min(1, t("YupStatusRequired")),
        term: z.string().min(1, t("YupTermRequired"))
    });
