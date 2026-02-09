import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax, stringMax, requiredNumberMin, requiredNumber } from "../common";

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
        importance: requiredNumberMin(t, "YupImportanceRequired", 1),
        difficulty: requiredNumberMin(t, "YupDificultyRequired", 1),
        iconId: z.string().min(1, t("YupIconRequired")),
        categoriesId: z.array(z.string()).min(1, t("YupRequiredCategories"))
    });

export const habitCreateSchema = (t: TFunction) =>
    baseHabitSchema(t).extend({
        experience: requiredNumber(t, "YupRequiredExperience")
    });

export const habitEditSchema = (t: TFunction) => baseHabitSchema(t);
