import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button";
import Modal from "../modals/Modal";
import Block from "./Block";

/** How keeping a line went. `full` is the profile at its cap, which the block explains in place. */
export type OldNoteKeepOutcome = "ok" | "full" | "error";

type OldNoteBlockProps = {
    /** The old note, one sentence per line, exactly as the server sent them. */
    lines: string[];
    onKeep: (line: string) => Promise<OldNoteKeepOutcome>;
    /** Each resolves true when the server kept the change. On false the caller has toasted. */
    onDiscard: (line: string) => Promise<boolean>;
    onClear: () => Promise<boolean>;
};

/**
 * The note the assistant used to keep out of sight, shown so the person can decide on each
 * line: keep it in the profile, where they can read it from now on, or drop it. Until they do,
 * it still goes with every conversation, and the heading says so.
 *
 * It goes away by itself once the last line is dealt with.
 */
export default function OldNoteBlock({ lines, onKeep, onDiscard, onClear }: OldNoteBlockProps) {
    const { t } = useTranslation();
    const titleId = useId();
    const [busyLine, setBusyLine] = useState<string | null>(null);
    const [full, setFull] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [clearing, setClearing] = useState(false);

    if (lines.length === 0) return null;

    const keep = async (line: string) => {
        setBusyLine(line);
        const outcome = await onKeep(line);
        setBusyLine(null);
        setFull(outcome === "full");
    };

    const discard = async (line: string) => {
        setBusyLine(line);
        const ok = await onDiscard(line);
        setBusyLine(null);
        // Room may have been made elsewhere meanwhile; the next keep says again if not.
        if (ok) setFull(false);
    };

    const clear = async () => {
        setClearing(true);
        const ok = await onClear();
        setClearing(false);
        if (ok) setConfirming(false);
    };

    return (
        <Block
            title={t("SecondBrainOldNoteTitle")}
            hint={t("SecondBrainOldNoteHint")}
            testId="second-brain-old-note"
            action={
                <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="rounded-control py-1 text-[13px] font-semibold text-text-2 transition-colors duration-200 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    data-testid="second-brain-old-note-clear"
                >
                    {t("SecondBrainOldNoteClear")}
                </button>
            }
        >
            <ul className="flex flex-col divide-y divide-border">
                {/* The index too: nothing stops the old note from saying the same thing twice. */}
                {lines.map((line, index) => (
                    <li key={`${index}:${line}`} className="py-3 first:pt-0 last:pb-0" data-testid="second-brain-old-note-line">
                        <p className="break-words text-sm leading-snug text-text">{line}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                                text={t("SecondBrainOldNoteKeep")}
                                mode="tonal"
                                size="small"
                                disabled={busyLine !== null}
                                onClick={() => void keep(line)}
                                testId="second-brain-old-note-keep"
                            />
                            <Button
                                text={t("Delete")}
                                mode="ghost"
                                size="small"
                                disabled={busyLine !== null}
                                onClick={() => void discard(line)}
                                testId="second-brain-old-note-discard"
                            />
                        </div>
                    </li>
                ))}
            </ul>

            {full && (
                <p role="status" className="mt-4 text-[13px] leading-snug text-text-2" data-testid="second-brain-old-note-full">
                    {t("SECOND_BRAIN_FACT_LIMIT_REACHED")}
                </p>
            )}

            <Modal
                isOpen={confirming}
                onClose={() => setConfirming(false)}
                labelledBy={titleId}
                className="max-w-md"
            >
                <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                    {t("SecondBrainOldNoteClearTitle")}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-snug text-text-2">{t("SecondBrainOldNoteClearBody")}</p>
                <div className="mt-4 flex justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={() => setConfirming(false)} />
                    <Button
                        text={t("Delete")}
                        mode="danger"
                        size="medium"
                        type="button"
                        disabled={clearing}
                        onClick={() => void clear()}
                        testId="second-brain-old-note-clear-confirm"
                    />
                </div>
            </Modal>
        </Block>
    );
}
