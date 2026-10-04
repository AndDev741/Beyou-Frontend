import { useTranslation } from "react-i18next";
import type { NotebookStatus, StatusChoice } from "@beyou/types/notebook/notebook";

const CHOICES: { value: NotebookStatus; key: string }[] = [
    { value: "TO_STUDY", key: "NotebookStatusToStudy" },
    { value: "STUDYING", key: "NotebookStatusStudying" },
    { value: "DONE", key: "NotebookStatusDone" },
];

/**
 * The three statuses as a segmented control. On a page whose board has nodes, a status set here
 * holds until "Follow nodes" hands it back (AUTO).
 */
export default function StatusPicker({
    status,
    manual,
    hasBoard,
    onChange,
    compact = false,
}: {
    status: NotebookStatus;
    manual: boolean;
    hasBoard: boolean;
    onChange: (choice: StatusChoice) => void;
    compact?: boolean;
}) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-1.5">
            <div role="radiogroup" aria-label={t("NotebookStatus")} className="flex gap-0.5 rounded-control bg-surface-2 p-[3px]">
                {CHOICES.map((choice) => {
                    const active = choice.value === status;
                    return (
                        <button
                            key={choice.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            data-testid={`status-${choice.value}`}
                            onClick={() => !active && onChange(choice.value)}
                            className={`flex-1 rounded-lg font-semibold transition-colors ${compact ? "h-7 px-2 text-xs" : "h-8 px-3 text-[13px]"} ${
                                active ? "bg-surface text-accent shadow-sm" : "text-text-2 hover:text-text"
                            }`}
                        >
                            {t(choice.key)}
                        </button>
                    );
                })}
            </div>
            {hasBoard && manual && (
                <button type="button" onClick={() => onChange("AUTO")} className="self-start text-xs font-semibold text-accent">
                    {t("NotebookStatusFollowNodes")}
                </button>
            )}
        </div>
    );
}
