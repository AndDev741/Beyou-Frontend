import { z } from "zod";
import type { TFunction } from "i18next";

export const aiDescriptionSchema = (t: TFunction) =>
    z.object({
        description: z
            .string()
            .trim()
            .min(10, t("DescriptionTooShort"))
            .max(2000, t("DescriptionTooLong"))
    });
