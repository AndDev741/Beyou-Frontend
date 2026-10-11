import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateStudyBlock } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import type { BlockMode, BlockPatch, GoalSource, StudyBlock, StudyCycle } from "@beyou/types/notebook/studyCycle";
import Modal from "../../modals/Modal";
import ErrorNotice from "../../ErrorNotice";
import { useTopicPages } from "./useTopicPages";

type Props = {
    cycle: StudyCycle;
    block: StudyBlock | null;
    onClose: () => void;
    /** The cycle as the server returns it after the change. */
    onSaved: (cycle: StudyCycle) => void;
};

/** A segmented pair of buttons, the way the editor picks between two options. */
function Segmented<T extends string>({ label, value, options, onChange, testId }: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    testId?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-text">{label}</span>
            <div role="group" aria-label={label} className="inline-flex w-fit rounded-control bg-surface-2 p-1" data-testid={testId}>
                {options.map((option) => (
                    <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}
                        data-testid={testId ? `${testId}-${option.value}` : undefined}
                        className={`h-8 rounded-[8px] px-3 text-[13px] font-semibold ${
                            value === option.value ? "bg-surface text-text shadow-surface" : "text-text-2 hover:text-text"
                        }`}>
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * One block's own settings: what it is after (time or a concept), which concept (the roadmap's
 * next, or a page picked here), its minutes, whether the quiz has to be passed too, and a note.
 *
 * Sent as a PATCH of every field the dialog shows. The lap progress is the server's: a block that
 * already closed keeps its state whatever changes here.
 */
export default function BlockDialog({ cycle, block, onClose, onSaved }: Props) {
    if (!block) return null;
    return <BlockForm key={block.id} cycle={cycle} block={block} onClose={onClose} onSaved={onSaved} />;
}

function BlockForm({ cycle, block, onClose, onSaved }: Props & { block: StudyBlock }) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<BlockMode>(block.mode);
    const [source, setSource] = useState<GoalSource>(block.goalSource ?? "NEXT");
    const [pageId, setPageId] = useState(block.page?.id ?? "");
    const [planned, setPlanned] = useState(block.plannedMinutes);
    const [requireQuiz, setRequireQuiz] = useState(block.requireQuiz);
    const [note, setNote] = useState(block.note ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const { pages, loading } = useTopicPages(block.topic.id);

    const goal = mode === "GOAL";
    const needsPage = goal && source === "PAGE";
    const validPlanned = Number.isInteger(planned) && planned >= 5 && planned <= 600;
    const canSave = validPlanned && (!needsPage || Boolean(pageId)) && !busy;

    const save = async () => {
        if (!canSave) return;
        const patch: BlockPatch = {
            mode,
            plannedMinutes: planned,
            goalSource: goal ? source : null,
            // NEXT follows the roadmap, so a page left over from PAGE would only confuse the server.
            pageId: goal && source === "NEXT" ? null : pageId || null,
            requireQuiz: goal ? requireQuiz : false,
            note: note.trim() || null,
        };
        setBusy(true);
        setError(null);
        const response = await updateStudyBlock(cycle.id, block.id, patch, t);
        setBusy(false);
        if (!response.success) {
            setError(response.error ?? {});
            return;
        }
        onSaved(response.success);
        onClose();
    };

    return (
        <Modal isOpen onClose={onClose} labelledBy="block-dialog-title" className="max-w-lg">
            <form className="flex w-full flex-col gap-4" data-testid="block-dialog"
                onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                }}>
                <div>
                    <h2 id="block-dialog-title" className="text-lg font-semibold text-text">
                        {t("StudyBlockDialogTitle", { position: block.position, topic: block.topic.title })}
                    </h2>
                    <p className="mt-1 text-[13px] text-text-2">{t("StudyBlockDialogIntro")}</p>
                </div>

                <Segmented label={t("StudyBlockGoalLabel")} value={mode} onChange={setMode} testId="block-mode"
                    options={[{ value: "TIME", label: t("StudyCycleModeTime") }, { value: "GOAL", label: t("StudyCycleModeGoal") }]} />

                {goal && (
                    <Segmented label={t("StudyBlockConceptLabel")} value={source} onChange={setSource} testId="block-source"
                        options={[{ value: "NEXT", label: t("StudyBlockSourceNext") }, { value: "PAGE", label: t("StudyBlockSourcePage") }]} />
                )}

                {(!goal || source === "PAGE") && (
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                        {goal ? t("StudyBlockPage") : t("StudyBlockPageOptional")}
                        <select value={pageId} onChange={(e) => setPageId(e.target.value)} disabled={loading} data-testid="block-page"
                            className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent disabled:opacity-60">
                            <option value="">{goal ? t("StudyBlockPickPage") : t("StudySessionNoPage")}</option>
                            {pages.map((page) => (
                                <option key={page.id} value={page.id}>{`${"  ".repeat(page.depth)}${page.title}`}</option>
                            ))}
                        </select>
                    </label>
                )}

                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                    {t("StudyBlockMinutes")}
                    <input type="number" inputMode="numeric" min={5} max={600} step={5} value={Number.isNaN(planned) ? "" : planned}
                        onChange={(e) => setPlanned(e.target.value === "" ? NaN : Math.round(Number(e.target.value)))}
                        data-testid="block-minutes"
                        className="h-11 w-36 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent" />
                    <span className="text-xs font-normal text-text-2">{goal ? t("StudyBlockMinutesGoalHint") : t("StudyBlockMinutesTimeHint")}</span>
                </label>

                {goal && (
                    <label className="flex items-start gap-2.5 text-sm text-text">
                        <input type="checkbox" checked={requireQuiz} onChange={(e) => setRequireQuiz(e.target.checked)} data-testid="block-quiz"
                            className="mt-0.5 h-4 w-4 accent-accent" />
                        <span>
                            <span className="font-semibold">{t("StudyBlockRequireQuiz")}</span>
                            <span className="block text-xs text-text-2">{t("StudyBlockRequireQuizHint")}</span>
                        </span>
                    </label>
                )}

                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                    {t("StudyBlockNote")}
                    <input type="text" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} data-testid="block-note"
                        placeholder={t("StudyBlockNotePlaceholder")}
                        className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent" />
                </label>

                {block.progress.state !== "OPEN" && (
                    <p className="text-xs text-text-2">{t("StudyBlockClosedNote")}</p>
                )}

                <ErrorNotice error={error} />

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-control px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-2">
                        {t("Cancel")}
                    </button>
                    <button type="submit" disabled={!canSave} data-testid="block-save"
                        className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-60">
                        {t("Save")}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
