import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { FiCheckCircle, FiClock, FiSkipForward } from "react-icons/fi";
import { Snapshot, SnapshotCheck, SnapshotStructureSection } from "@beyou/types/routine/snapshot";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import { checkSnapshotItem, getSnapshot, skipSnapshotItem } from "@beyou/api/routine/snapshot";
import { enterSnapshot } from "@beyou/state/routine/snapshotSlice";
import useUiRefresh from "../../hooks/useUiRefresh";
import { resolveIcon } from "@beyou/icons";
import BeyouIcon from "../../ui/BeyouIcon";
import Card from "../../ui/Card";
import Ring from "../../ui/Ring";
import { formatTimeRange } from "@beyou/state";
import { parseLocalDate } from "@beyou/state";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";

type SnapshotRoutineCardProps = {
    snapshot: Snapshot;
    routineId: string;
};

/** Items with no time go last. */
const byStart = (
    a: { startTime: string | null; name: string },
    b: { startTime: string | null; name: string },
) => (a.startTime || "~~~~~").localeCompare(b.startTime || "~~~~~") || a.name.localeCompare(b.name);

/**
 * A past day, in the native design: the summary strip on top and one card per
 * section, all open.
 *
 * What left: the three badges (Sections / Done / Progress), the percentage bar,
 * the date repeated in a chip and the chevron to open. That was a lot of frame to
 * say "2 of 10" — and the page header already says you are looking at history.
 */
export const SnapshotRoutineCard = ({ snapshot, routineId }: SnapshotRoutineCardProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});

    useUiRefresh(refreshUi, { skipCelebrations: true });

    const stats = useMemo(() => {
        const completed = snapshot.checks.filter((c) => c.checked).length;
        const skipped = snapshot.checks.filter((c) => c.skipped).length;
        const xpEarned = snapshot.checks.reduce((sum, c) => sum + (c.checked ? c.xpGenerated || 0 : 0), 0);
        return { completed, skipped, xpEarned };
    }, [snapshot]);

    const sections = useMemo(
        () => [...snapshot.structure.sections].sort((a, b) => a.orderIndex - b.orderIndex),
        [snapshot.structure.sections],
    );

    const refetchSnapshot = async () => {
        const updated = await getSnapshot(routineId, snapshot.snapshotDate, t);
        if (updated?.success) {
            dispatch(enterSnapshot(updated.success));
        }
    };

    const handleCheck = async (check: SnapshotCheck) => {
        const response = await checkSnapshotItem(snapshot.id, check.id, t);
        if (response?.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        if (response?.success) {
            setRefreshUi(response.success);
            await refetchSnapshot();
        }
    };

    const handleSkip = async (check: SnapshotCheck) => {
        const response = await skipSnapshotItem(snapshot.id, check.id, t);
        if (response?.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        if (response?.success) {
            setRefreshUi(response.success);
            await refetchSnapshot();
        }
    };

    return (
        <div className="flex flex-col gap-3" data-testid="snapshot-routine-card">
            <div className="flex items-baseline gap-2">
                <b className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-text">
                    {snapshot.routineName}
                </b>
                <span className="shrink-0 font-mono text-[11.5px] text-text-3">
                    {parseLocalDate(snapshot.snapshotDate)?.toLocaleDateString() ?? ""}
                </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-card bg-accent/10 px-3 py-2.5 text-[13px]">
                <span className="text-text">
                    {t("Completed")}: {stats.completed}
                </span>
                <span className="text-text">
                    {t("Skipped")}: {stats.skipped}
                </span>
                <span className="font-semibold text-accent">
                    {stats.xpEarned} {t("XpEarned")}
                </span>
            </div>

            {sections.map((section, index) => (
                <SnapshotSection
                    key={`${section.name}-${index}`}
                    section={section}
                    checks={snapshot.checks}
                    onCheck={handleCheck}
                    onSkip={handleSkip}
                />
            ))}
        </div>
    );
};

type SnapshotSectionProps = {
    section: SnapshotStructureSection;
    checks: SnapshotCheck[];
    onCheck: (check: SnapshotCheck) => Promise<void>;
    onSkip: (check: SnapshotCheck) => Promise<void>;
};

const SnapshotSection = ({ section, checks, onCheck, onSkip }: SnapshotSectionProps) => {
    const { t } = useTranslation();
    const hasIcon = resolveIcon(section.iconId).kind !== "fallback";
    // Walks the STRUCTURE and finds each item's check by `groupId`, which is
    // unique per placement. Filtering the checks by section NAME duplicated a
    // habit whenever two sections shared a name.
    const items = useMemo(() => [...section.items].sort(byStart), [section.items]);

    return (
        <Card>
            <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-text-3">
                    {hasIcon ? <BeyouIcon id={section.iconId} /> : <FiClock aria-hidden="true" />}
                </span>
                <b className="min-w-0 truncate text-[15px] font-semibold text-accent">{section.name}</b>
                <span className="shrink-0 font-mono text-[11.5px] text-text-3">
                    {formatTimeRange(section.startTime || undefined, section.endTime || undefined)}
                </span>
            </div>

            {items.map((item) => {
                const check = checks.find((c) => c.originalGroupId === item.groupId);
                const hasItemIcon = item.iconId ? resolveIcon(item.iconId).kind !== "fallback" : false;
                const range = formatTimeRange(item.startTime || undefined, item.endTime || undefined);

                return (
                    <div key={item.groupId} className="mt-2 flex items-center gap-2">
                        <span className="shrink-0 text-text-3">
                            {hasItemIcon ? <BeyouIcon id={item.iconId} /> : <FiCheckCircle aria-hidden="true" />}
                        </span>
                        <span
                            className={`min-w-0 flex-1 truncate text-[13px] ${
                                check?.checked || check?.skipped ? "text-text-3" : "text-text"
                            } ${check?.checked || check?.skipped ? "line-through" : ""}`}
                        >
                            {item.name}
                        </span>
                        {range && (
                            <span className="shrink-0 font-mono text-[11.5px] text-text-3">{range}</span>
                        )}

                        {check && (
                            <div className="flex shrink-0 items-center gap-1.5">
                                <label className="flex min-h-[32px] min-w-[32px] cursor-pointer items-center justify-center">
                                    <input
                                        type="checkbox"
                                        aria-label={item.name}
                                        className="peer sr-only"
                                        checked={check.checked}
                                        onChange={() => onCheck(check)}
                                    />
                                    <Ring
                                        size={22}
                                        state={check.checked ? "done" : check.skipped ? "skipped" : "todo"}
                                        className="rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface"
                                    />
                                </label>
                                {!check.checked && (
                                    <button
                                        type="button"
                                        aria-label={check.skipped ? t("Undo skip") : t("Skip")}
                                        title={check.skipped ? t("Undo skip") : t("Skip")}
                                        onClick={() => onSkip(check)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 hover:bg-surface-2 ${
                                            check.skipped ? "text-text-2" : "text-text-3"
                                        }`}
                                    >
                                        <FiSkipForward size={16} aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </Card>
    );
};
