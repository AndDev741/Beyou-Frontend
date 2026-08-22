import { z } from "zod";
import type { TFunction } from "i18next";
import { requiredStringWithMinMax, stringMax } from "../common";

// users.name, perfil_phrase and perfil_phrase_author are varchar(255).
export const profileSchema = (t: TFunction) =>
    z.object({
        name: requiredStringWithMinMax(t, {
            requiredKey: "YupNameRequired",
            minKey: "YupMinimumName",
            maxKey: "YupMaxName",
            min: 2,
            max: 255
        }),
        phrase: stringMax(t, 255, "YupGenericMaxLength"),
        phrase_author: stringMax(t, 255, "YupGenericMaxLength")
    });
