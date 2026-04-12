import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax, stringMax, requiredNumberMinMax, requiredNumber } from "../common";

const baseHabitSchema = (t: TFunction) =>
    z.object({
        name: requiredStringWithMinMax(t, {
            requiredKey: "YupNameRequired",
            minKey: "YupMinimumName",
            maxKey: "YupMaxName",
            min: 2,
            max: 256
        }),
        description: stringMax(t, 256, "YupDescriptionMaxValue"),
        motivationalPhrase: stringMax(t, 256, "YupGenericMaxLength"),
        importance: requiredNumberMinMax(t, "YupImportanceRequired", "YupMaxImportance", 1, 5),
        difficulty: requiredNumberMinMax(t, "YupDificultyRequired", "YupMaxDifficulty", 1, 5),
        iconId: z.string().min(1, t("YupIconRequired")),
        categoriesId: z.array(z.string()).min(1, t("YupRequiredCategories"))
    });

export const habitCreateSchema = (t: TFunction) =>
    baseHabitSchema(t).extend({
        experience: requiredNumber(t, "YupRequiredExperience")
    });

export const habitEditSchema = (t: TFunction) => baseHabitSchema(t);
