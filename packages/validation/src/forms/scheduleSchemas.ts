import { z } from "zod";
import type { TFunction } from "i18next";

/**
 * `CreateScheduleDTO.days` is `@NotEmpty`: an empty selection used to sail through
 * the form and come back as a 400. A factory like the other schemas, so the message
 * is translated.
 */
export const scheduleSchema = (t: TFunction) =>
    z.object({
        days: z.array(z.string()).min(1, t("DaysRequired"))
    });
