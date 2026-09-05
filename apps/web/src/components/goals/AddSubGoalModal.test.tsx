import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { goal } from "@beyou/types/goals/goalType";
import { renderWithProviders } from "../../test/test-utils";
import moveGoalUnder from "@beyou/api/goals/moveGoalUnder";
import AddSubGoalModal from "./AddSubGoalModal";

vi.mock("@beyou/api/goals/moveGoalUnder", () => ({ default: vi.fn().mockResolvedValue({ success: "ok" }) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const g = (id: string, over: Partial<goal> = {}): goal =>
    ({
        id, name: id, iconId: "lucide:book", targetValue: 10, unit: "km", currentValue: 0, complete: false,
        categories: {}, startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), xpReward: 50,
        status: "IN_PROGRESS", term: "LONG_TERM", parentId: null, ...over,
    }) as goal;

// marathon > tenK > weekly, plus a free root.
const marathon = g("marathon", { name: "Run a marathon" });
const tenK = g("tenk", { name: "Run 10 km", parentId: "marathon" });
const weekly = g("weekly", { name: "Run 3x a week", parentId: "tenk" });
const other = g("other", { name: "Learn French" });
const all = [marathon, tenK, weekly, other];

describe("AddSubGoalModal", () => {
    it("explains the move, offers only goals that fit, and moves the picked one", async () => {
        const onMoved = vi.fn();
        const onCreateNew = vi.fn();
        // The suite resets mock implementations between tests, so the resolved value is set here.
        vi.mocked(moveGoalUnder).mockResolvedValue({ success: "ok" });
        renderWithProviders(
            <AddSubGoalModal parent={tenK} allGoals={all} onClose={vi.fn()} onCreateNew={onCreateNew} onMoved={onMoved} />,
        );

        // The web unit suite renders raw keys (no i18n resources loaded), so the explanation is its key.
        expect(screen.getByText("AddSubGoalExplain")).toBeInTheDocument();
        // `other` fits as a third level; the ancestor and the existing child are not offered.
        expect(screen.getByTestId("add-subgoal-pick-other")).toBeInTheDocument();
        expect(screen.queryByTestId("add-subgoal-pick-marathon")).not.toBeInTheDocument();
        expect(screen.queryByTestId("add-subgoal-pick-weekly")).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId("add-subgoal-pick-other"));
        await waitFor(() => expect(moveGoalUnder).toHaveBeenCalledWith(other, "tenk", expect.anything()));
        await waitFor(() => expect(onMoved).toHaveBeenCalled());

        fireEvent.click(screen.getByTestId("add-subgoal-create"));
        expect(onCreateNew).toHaveBeenCalledWith(tenK);
    });

    it("says so when nothing can go under a third-level goal", () => {
        renderWithProviders(
            <AddSubGoalModal parent={weekly} allGoals={all} onClose={vi.fn()} onCreateNew={vi.fn()} onMoved={vi.fn()} />,
        );
        expect(screen.getByTestId("add-subgoal-none")).toBeInTheDocument();
    });
});
