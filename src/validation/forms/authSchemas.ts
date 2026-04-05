import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax } from "../common";

const passwordStrengthField = (t: TFunction) =>
    z
        .string()
        .trim()
        .superRefine((value, ctx) => {
            if (!value) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("YupNecessaryPassword") });
                return;
            }
            if (value.length < 12) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("YupMinimumPassword") });
                return;
            }
            if (value.length > 256) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("YupMaxLength") });
                return;
            }
            let classes = 0;
            if (/[a-z]/.test(value)) classes++;
            if (/[A-Z]/.test(value)) classes++;
            if (/[0-9]/.test(value)) classes++;
            if (/[^a-zA-Z0-9]/.test(value)) classes++;
            if (classes < 2) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("YupPasswordStrength") });
            }
        });

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
        password: passwordStrengthField(t)
    });

export const forgotPasswordSchema = (t: TFunction) =>
    z.object({
        email: z
            .string()
            .trim()
            .min(1, t("YupNecessaryEmail"))
            .email(t("YupInvalidEmail"))
            .max(256, t("YupMaxLength"))
    });

export const resetPasswordSchema = (t: TFunction) =>
    z.object({
        password: passwordStrengthField(t),
        confirmPassword: passwordStrengthField(t)
    });
