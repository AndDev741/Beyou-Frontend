import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GitBranch, Plus, X } from "lucide-react";
import { toast } from "react-toastify";
import type { goal } from "@beyou/types/goals/goalType";
import { MAX_GOAL_DEPTH, ancestorsOf, depthOf, subtreeHeight } from "@beyou/state";
import moveGoalUnder from "@beyou/api/goals/moveGoalUnder";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import Modal from "../modals/Modal";
import Button from "../Button";
import BeyouIcon from "../../ui/BeyouIcon";
import IconTile from "../../ui/IconTile";
import XpBar from "../../ui/XpBar";

type AddSubGoalModalProps = {
    /** The goal that gets a sub-goal; null keeps the modal closed. */
    parent: goal | null;
    allGoals: goal[];
    onClose: () => void;
    /** "Create a new sub-goal": the caller opens the goal form with the parent preset. */
    onCreateNew: (parent: goal) => void;
    /** After a move landed, so the list refetches. */
    onMoved: () => void;
};

/**
 * The step between "Add sub-goal" and a form, same as on the phone.
 *
 * A branch icon that opened the create form with a parent already picked explained
 * nothing. This says in words what is about to happen and offers the two ways to do
 * it: move a goal that already exists under this one, or create a new one.
 *
 * The candidates are the list the server would accept, filtered here so the modal
 * never offers what the save would refuse: not the goal itself, not already its child,
 * not one of its ancestors, and short enough that the chain still fits in three
 * levels with whatever hangs under the candidate.
 */
export default function AddSubGoalModal({ parent, allGoals, onClose, onCreateNew, onMoved }: AddSubGoalModalProps) {
    const { t } = useTranslation();
    const [movingId, setMovingId] = useState<string | null>(null);

    const candidates = useMemo(() => {
        if (!parent) return [];
        const ancestorIds = new Set(ancestorsOf(allGoals, parent.id).map((g) => g.id));
        const parentDepth = depthOf(allGoals, parent.id);
        return allGoals
            .filter((g) => g.id !== parent.id && g.parentId !== parent.id && !ancestorIds.has(g.id))
            .filter((g) => parentDepth + 1 + subtreeHeight(allGoals, g.id) <= MAX_GOAL_DEPTH)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }, [allGoals, parent]);

    if (!parent) return null;

    const move = async (candidate: goal) => {
        setMovingId(candidate.id);
        const res = await moveGoalUnder(candidate, parent.id, t);
        setMovingId(null);
        if (res.error) {
            toast.error(getFriendlyErrorMessage(t, res.error));
            return;
        }
        if (res.validation) {
            toast.error(res.validation);
            return;
        }
        toast.success(t("SubGoalMoved", { name: candidate.name, parent: parent.name }));
        onMoved();
        onClose();
    };

    return (
        <Modal isOpen onClose={onClose} labelledBy="add-subgoal-title" className="max-w-md">
            <div data-testid="add-subgoal-modal">
                <div className="flex items-center gap-2">
                    <GitBranch size={16} aria-hidden="true" className="text-accent" />
                    <h2 id="add-subgoal-title" className="flex-1 text-base font-semibold tracking-[-0.01em] text-text">
                        {t("AddSubGoal")}
                    </h2>
                    <button
                        type="button"
                        aria-label={t("Close")}
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug text-text-2">
                    {t("AddSubGoalExplain", { name: parent.name })}
                </p>

                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[1px] text-text-3">
                    {t("MoveExistingGoalHere")}
                </p>
                {candidates.length === 0 ? (
                    <p className="mt-2 text-[12.5px] text-text-3" data-testid="add-subgoal-none">
                        {t("NoGoalFitsHere")}
                    </p>
                ) : (
                    <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                        {candidates.map((candidate) => (
                            <li key={candidate.id}>
                                <button
                                    type="button"
                                    onClick={() => void move(candidate)}
                                    disabled={movingId !== null}
                                    data-testid={`add-subgoal-pick-${candidate.id}`}
                                    className={`flex w-full items-center gap-2.5 rounded-control border border-border px-3 py-2 text-left transition-colors duration-200 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                                        movingId === candidate.id ? "opacity-60" : ""
                                    }`}
                                >
                                    <IconTile size={28}>
                                        <BeyouIcon id={candidate.iconId} size={14} />
                                    </IconTile>
                                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                                        <span className="truncate text-[13px] font-semibold text-text">{candidate.name}</span>
                                        <XpBar current={candidate.currentValue} target={candidate.targetValue} compact />
                                    </span>
                                    <span className="shrink-0 font-mono text-[11px] text-text-3">
                                        {candidate.currentValue}/{candidate.targetValue}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-4 flex justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={onClose} />
                    <Button
                        text={t("CreateNewSubGoal")}
                        mode="primary"
                        size="medium"
                        type="button"
                        icon={<Plus size={14} aria-hidden="true" />}
                        onClick={() => onCreateNew(parent)}
                        testId="add-subgoal-create"
                    />
                </div>
            </div>
        </Modal>
    );
}
