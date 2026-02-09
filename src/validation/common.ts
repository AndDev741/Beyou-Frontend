import { z } from "zod";
import type { TFunction } from "i18next";

const toNumber = (value: unknown) => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const numberValue = Number(trimmed);
        return Number.isNaN(numberValue) ? value : numberValue;
    }
    return value;
};

export const requiredStringWithMinMax = (
    t: TFunction,
    {
        requiredKey,
        minKey,
        maxKey,
        min,
        max
    }: {
        requiredKey: string;
        minKey: string;
        maxKey: string;
        min: number;
        max: number;
    }
) =>
    z.string().trim().superRefine((value, ctx) => {
        if (!value) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(requiredKey) });
            return;
        }
        if (value.length < min) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(minKey) });
            return;
        }
        if (value.length > max) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(maxKey) });
        }
    });

export const requiredString = (t: TFunction, requiredKey: string) =>
    z.string().trim().min(1, t(requiredKey));

export const stringMax = (t: TFunction, max: number, maxKey: string) =>
    z.string().max(max, t(maxKey));

export const requiredNumber = (t: TFunction, requiredKey: string) =>
    z.preprocess(
        toNumber,
        z.number({
            required_error: t(requiredKey),
            invalid_type_error: t(requiredKey)
        })
    );

export const requiredNumberMin = (t: TFunction, requiredKey: string, min: number) =>
    z.preprocess(
        toNumber,
        z
            .number({
                required_error: t(requiredKey),
                invalid_type_error: t(requiredKey)
            })
            .min(min, t(requiredKey))
    );

export const stringDateRequired = (t: TFunction, requiredKey: string) =>
    z.string().min(1, t(requiredKey));

export const stringUrlOptional = (t: TFunction, invalidKey: string, maxKey: string) =>
    z.string().trim().superRefine((value, ctx) => {
        if (!value) return;
        if (value.length > 2048) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(maxKey) });
            return;
        }
        try {
            const url = new URL(value);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(invalidKey) });
            }
        } catch (e) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(invalidKey) });
        }
    });
