import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax, stringMax, requiredNumber } from "../common";

const baseCategorySchema = (t: TFunction) =>
    z.object({
        name: requiredStringWithMinMax(t, {
            requiredKey: "YupNameRequired",
            minKey: "YupMinimumName",
            maxKey: "YupMaxName",
            min: 2,
            max: 256
        }),
        description: stringMax(t, 256, "YupDescriptionMaxValue"),
        iconId: z.string().min(1, t("YupIconRequired"))
    });

export const categoryCreateSchema = (t: TFunction) =>
    baseCategorySchema(t).extend({
        experience: requiredNumber(t, "YupRequiredExperience")
    });

export const categoryEditSchema = (t: TFunction) => baseCategorySchema(t);
