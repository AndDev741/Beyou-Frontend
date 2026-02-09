import { z } from "zod";

export const scheduleSchema = z.object({
    days: z.array(z.string())
});
