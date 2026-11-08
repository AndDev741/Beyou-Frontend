import { describe, it, expect } from "vitest";
import type { TFunction } from "i18next";
import { routineListFormSchema, routineListItemSchema } from "./routineSchemas";

const t = ((key: string) => key) as unknown as TFunction;

describe("routineListItemSchema days", () => {
    it("keeps an entry's days through the parse", () => {
        const parsed = routineListItemSchema(t).parse({
            id: "g1",
            type: "HABIT",
            habitId: "h1",
            taskId: null,
            days: ["Saturday"],
        });
        expect(parsed.days).toEqual(["Saturday"]);
    });

    it("leaves days absent when the entry has none, so the server keeps what it stored", () => {
        const parsed = routineListItemSchema(t).parse({ type: "TASK", taskId: "t1" });
        expect("days" in parsed).toBe(false);
    });

    it("refuses a value that is not a weekday", () => {
        const result = routineListItemSchema(t).safeParse({ type: "HABIT", habitId: "h1", days: ["Someday"] });
        expect(result.success).toBe(false);
    });

    it("keeps the days of every item in the whole list form", () => {
        const parsed = routineListFormSchema(t).parse({
            routineName: "Weekend",
            items: [
                { type: "HABIT", habitId: "h1", days: ["Saturday", "Sunday"] },
                { type: "TASK", taskId: "t1", days: [] },
            ],
        });
        expect(parsed.items.map((item) => item.days)).toEqual([["Saturday", "Sunday"], []]);
    });
});
