import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax } from "../common";

export const loginSchema = (t: TFunction) =>
    z.object({
        email: z
            .string()
            .trim()
            .min(1, t("YupNecessaryEmail"))
            .email(t("YupInvalidEmail"))
            .max(256, t("YupMaxLength")),
        password: z
            .string()
            .min(1, t("YupNecessaryPassword"))
            .max(256, t("YupMaxLength"))
    });

export const registerSchema = (t: TFunction) =>
    z.object({
        name: requiredStringWithMinMax(t, {
            requiredKey: "YupNameRequired",
            minKey: "YupMinimumName",
            maxKey: "YupMaxLength",
            min: 2,
            max: 256
        }),
        email: z
            .string()
            .trim()
            .min(1, t("YupNecessaryEmail"))
            .email(t("YupInvalidEmail"))
            .max(256, t("YupMaxLength")),
        password: requiredStringWithMinMax(t, {
            requiredKey: "YupNecessaryPassword",
            minKey: "YupMinimumPassword",
            maxKey: "YupMaxLength",
            min: 6,
            max: 256
        })
    });
