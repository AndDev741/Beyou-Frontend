import { useState } from "react";
import { useTranslation } from "react-i18next";
import { blockPlainText, type ConflictChoice, type DocBlock, type MergeResult } from "@beyou/state";
import Modal from "../../modals/Modal";

/**
 * The part of a merge only the person can settle: blocks that changed both here and wherever
 * the page was saved meanwhile. Everything else is already merged. Each block keeps both
 * versions unless the person picks one, so closing the dialog without choosing loses nothing.
 */
export default function ConflictDialog({ conflict, onResolve }: {
    conflict: MergeResult | null;
    onResolve: (choices: Record<string, ConflictChoice>) => void;
}) {
    const { t } = useTranslation();
    const [choices, setChoices] = useState<Record<string, ConflictChoice>>({});
    const apply = () => {
        onResolve(choices);
        setChoices({});
    };
    const text = (block: DocBlock | null) =>
        block === null ? t("NotebookConflictRemoved") : blockPlainText(block) || (block.type ?? "");

    return (
        <Modal isOpen={conflict !== null} onClose={apply} labelledBy="conflict-title">
            <div className="flex w-full flex-col gap-4" data-testid="conflict-dialog">
                <div className="flex flex-col gap-1">
                    <h2 id="conflict-title" className="text-lg font-semibold text-text">{t("NotebookConflictTitle")}</h2>
                    <p className="text-sm text-text-2">{t("NotebookConflictIntro")}</p>
                </div>
                {conflict?.conflicts.map((c) => {
                    const chosen = choices[c.id] ?? "both";
                    const options: { value: ConflictChoice; label: string }[] = [
                        { value: "both", label: t("NotebookConflictKeepBoth") },
                        { value: "mine", label: t("NotebookConflictKeepMine") },
                        { value: "theirs", label: t("NotebookConflictKeepTheirs") },
                    ];
                    return (
                        <fieldset key={c.id} className="flex flex-col gap-2" data-testid="conflict-block">
                            <legend className="sr-only">{text(c.mine) || text(c.theirs)}</legend>
                            <div className="overflow-hidden rounded-[12px] border border-border">
                                <div className="flex flex-col gap-0.5 border-b border-border px-3 py-2">
                                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-accent">{t("NotebookConflictHere")}</span>
                                    <span className="text-sm text-text" data-testid="conflict-mine">{text(c.mine)}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 bg-surface-2 px-3 py-2">
                                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-2">{t("NotebookConflictThere")}</span>
                                    <span className="text-sm text-text" data-testid="conflict-theirs">{text(c.theirs)}</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {options.map((option) => (
                                    <label key={option.value}
                                        className={`inline-flex cursor-pointer items-center gap-2 rounded-control border px-3 py-1.5 text-[13px] font-semibold ${
                                            chosen === option.value ? "border-accent bg-accent-soft text-accent" : "border-border text-text hover:bg-surface-2"
                                        }`}>
                                        <input type="radio" name={`conflict-${c.id}`} value={option.value} checked={chosen === option.value}
                                            onChange={() => setChoices((current) => ({ ...current, [c.id]: option.value }))}
                                            className="sr-only" />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    );
                })}
                <div className="flex justify-end">
                    <button type="button" onClick={apply} data-testid="conflict-apply"
                        className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent">
                        {t("NotebookConflictApply")}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
