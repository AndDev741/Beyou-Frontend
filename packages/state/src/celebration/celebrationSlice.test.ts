import { describe, expect, it } from "vitest";
import reducer, { celebrationPushed, celebrationShifted } from "./celebrationSlice";

describe("celebrationSlice", () => {
    it("pushes celebrations onto the queue", () => {
        const state = reducer(undefined, celebrationPushed({ kind: "levelUp", level: 3 }));
        expect(state.queue).toEqual([{ kind: "levelUp", level: 3 }]);
    });
    it("shifts the first celebration off the queue", () => {
        const initial = { queue: [{ kind: "levelUp" as const, level: 3 }, { kind: "streakMilestone" as const, days: 7 }] };
        const state = reducer(initial, celebrationShifted());
        expect(state.queue).toEqual([{ kind: "streakMilestone", days: 7 }]);
    });
});
