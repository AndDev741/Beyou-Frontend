import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax, stringMax, stringUrlOptional } from "../common";

export const profileSchema = (t: TFunction) =>
    z.object({
        name: requiredStringWithMinMax(t, {
            requiredKey: "YupNameRequired",
            minKey: "YupMinimumName",
            maxKey: "YupMaxName",
            min: 2,
            max: 256
        }),
        photo: stringUrlOptional(t, "ProfilePhotoUrlInvalid", "ProfilePhotoUrlMax"),
        phrase: stringMax(t, 256, "YupGenericMaxLength"),
        phrase_author: stringMax(t, 256, "YupGenericMaxLength")
    });

export const photoUrlSchema = (t: TFunction) =>
    z.object({
        photo: stringUrlOptional(t, "ProfilePhotoUrlInvalid", "ProfilePhotoUrlMax")
    });
