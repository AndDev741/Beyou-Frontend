import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { FiClock, FiChevronDown, FiCheckCircle, FiLayers, FiSlash } from "react-icons/fi";
import {
    Snapshot,
    SnapshotCheck,
    SnapshotStructureSection,
} from "../../types/routine/snapshot";
import { RefreshUI } from "../../types/refreshUi/refreshUi.type";
import { checkSnapshotItem, getSnapshot, skipSnapshotItem } from "../../services/routine/snapshot";
import { enterSnapshot } from "../../redux/routine/snapshotSlice";
import useUiRefresh from "../../hooks/useUiRefresh";
import iconSearch from "../icons/iconsSearch";
import { formatTimeRange, getTimeOfDay } from "./routineMetrics";
import { toast } from "react-toastify";
import { getFriendlyErrorMessage } from "../../services/apiError";

type SnapshotRoutineCardProps = {
    snapshot: Snapshot;
    routineId: string;
};

const timeOfDayClasses: Record<string, string> = {
    morning: "bg-primary/10 text-primary",
    afternoon: "bg-success/10 text-success",
    evening: "bg-secondary/10 text-secondary",
    night: "bg-description/20 text-secondary",
};

export const SnapshotRoutineCard = ({ snapshot, routineId }: SnapshotRoutineCardProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [expanded, setExpanded] = useState(false);
    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});

    useUiRefresh(refreshUi);

    const sectionsWithChecks = useMemo(() => {
        return snapshot.structure.sections.map((section) => ({
            ...section,
            checks: snapshot.checks.filter((c) => c.sectionName === section.name),
        }));
    }, [snapshot]);

    const stats = useMemo(() => {
        const totalItems = snapshot.checks.length;
        const completedItems = snapshot.checks.filter((c) => c.checked).length;
        const skippedItems = snapshot.checks.filter((c) => c.skipped).length;
        const xpEarned = snapshot.checks.reduce((sum, c) => sum + (c.xpGenerated || 0), 0);
        return { totalItems, completedItems, skippedItems, xpEarned };
    }, [snapshot]);

    const completion = stats.totalItems > 0 ? Math.round((stats.completedItems / stats.totalItems) * 100) : 0;

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
            setRefreshUi(response.success as RefreshUI);
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
            setRefreshUi(response.success as RefreshUI);
            await refetchSnapshot();
        }
    };

    return (
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-background shadow-sm transition-transform duration-200 hover:translate-y-[-1px] hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-description/60 via-primary/40 to-description/60" />
            <div className="p-3 md:p-4 space-y-4">
                <header className="flex items-start justify-between gap-3 md:gap-4">
                    <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 md:gap-2">
                                <button
                                    type="button"
                                    className="p-1 rounded-md border border-primary/20 text-secondary hover:border-primary/40 transition-transform duration-150 hover:-translate-y-0.5"
                                    onClick={() => setExpanded((prev) => !prev)}
                                    aria-label={expanded ? t("Collapse") : t("Expand")}
                                >
                                    <FiChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                                </button>
                                <span className="text-lg font-semibold text-secondary">
                                    {snapshot.routineName}
                                </span>
                            </div>
                            <span className="inline-flex items-center rounded-full border border-description/30 bg-description/10 px-3 py-1 text-xs font-semibold text-description">
                                {t("Historical view")}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full">
                            <Badge>
                                <FiLayers className="mr-1" /> {snapshot.structure.sections.length} {t("Sections")}
                            </Badge>
                            <Badge>
                                <FiCheckCircle className="mr-1" /> {stats.completedItems}/{stats.totalItems} {t("Done")}
                            </Badge>
                            <Badge>
                                <FiClock className="mr-1" /> {completion}% {t("Progress")}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap text-xs text-description w-full pl-1">
                            <span className="rounded-full bg-description/10 px-3 py-1 font-medium text-description">
                                {new Date(snapshot.snapshotDate).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ligthGray/40">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${completion}%` }}
                            />
                        </div>
                        <span className="text-sm font-semibold text-secondary w-14 text-right">{completion}%</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-secondary">
                        {stats.xpEarned > 0 ? (
                            <p className="text-success flex-1 min-w-[140px]">
                                +{stats.xpEarned} XP {t("earned on")} {new Date(snapshot.snapshotDate).toLocaleDateString()}
                            </p>
                        ) : (
                            <span className="flex-1 min-w-[140px]" />
                        )}
                        {snapshot.completed && (
                            <span className="text-success font-semibold">{t("Completed")}</span>
                        )}
                    </div>
                </div>

                {expanded && (
                    <div className="space-y-3">
                        {sectionsWithChecks.map((section, idx) => (
                            <SnapshotSectionRow
                                key={`${section.name}-${idx}`}
                                section={section}
                                checks={section.checks}
                                onCheck={handleCheck}
                                onSkip={handleSkip}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

type SnapshotSectionRowProps = {
    section: SnapshotStructureSection;
    checks: SnapshotCheck[];
    onCheck: (check: SnapshotCheck) => Promise<void>;
    onSkip: (check: SnapshotCheck) => Promise<void>;
};

const SnapshotSectionRow = ({ section, checks, onCheck, onSkip }: SnapshotSectionRowProps) => {
    const { t } = useTranslation();
    const Icon = iconSearch(section.iconId || "")?.IconComponent;
    const timeOfDay = getTimeOfDay(section.startTime || undefined);

    const sectionStats = useMemo(() => {
        const totalItems = checks.length;
        const completedItems = checks.filter((c) => c.checked).length;
        const xpEarned = checks.reduce((sum, c) => sum + (c.xpGenerated || 0), 0);
        return { totalItems, completedItems, xpEarned };
    }, [checks]);

    const sortedChecks = useMemo(() => {
        const matched = checks.map((check) => {
            const structItem = section.items.find((si) => si.groupId === check.originalGroupId);
            return { check, startTime: structItem?.startTime || null, endTime: structItem?.endTime || null };
        });
        return matched.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }, [checks, section.items]);

    return (
        <div className="rounded-lg border border-primary/15 bg-background/80 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 w-full">
                    <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${timeOfDayClasses[timeOfDay]} text-base`}
                    >
                        {Icon ? <Icon /> : <FiClock />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-base font-semibold text-secondary">{section.name}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-description">
                            <span className="flex items-center gap-1">
                                <FiClock /> {formatTimeRange(section.startTime || undefined, section.endTime || undefined)}
                            </span>
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                {t(timeOfDay)}
                            </span>
                            <span className="text-xs font-medium text-secondary">
                                {sectionStats.completedItems}/{sectionStats.totalItems} {t("Done")}
                            </span>
                            {sectionStats.xpEarned > 0 && (
                                <span className="text-xs font-medium text-success">+{sectionStats.xpEarned} XP</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {sortedChecks.length > 0 && (
                <div className="mt-3 space-y-2">
                    {sortedChecks.map(({ check, startTime, endTime }) => (
                        <SnapshotCheckItem
                            key={check.id}
                            check={check}
                            startTime={startTime}
                            endTime={endTime}
                            onCheck={onCheck}
                            onSkip={onSkip}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

type SnapshotCheckItemProps = {
    check: SnapshotCheck;
    startTime: string | null;
    endTime: string | null;
    onCheck: (check: SnapshotCheck) => Promise<void>;
    onSkip: (check: SnapshotCheck) => Promise<void>;
};

const SnapshotCheckItem = ({ check, startTime, endTime, onCheck, onSkip }: SnapshotCheckItemProps) => {
    const { t } = useTranslation();
    const ItemIcon = check.itemIconId ? iconSearch(check.itemIconId)?.IconComponent : null;

    return (
        <div
            className={`group flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                check.skipped
                    ? "border-description/20 bg-description/5 text-description opacity-60"
                    : check.checked
                    ? "border-success/30 bg-success/10 text-secondary"
                    : "border-primary/10 bg-background text-secondary"
            }`}
        >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {ItemIcon ? <ItemIcon /> : <FiCheckCircle />}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${check.skipped ? "line-through" : ""}`}>{check.itemName}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-description">
                    {(startTime || endTime) && (
                        <span className="flex items-center gap-1">
                            <FiClock /> {formatTimeRange(startTime || undefined, endTime || undefined)}
                        </span>
                    )}
                    <span className="rounded-full bg-ligthGray/40 px-2 py-0.5 font-semibold text-secondary/80">
                        {check.itemType === "TASK" ? t("Task") : t("Habit")}
                    </span>
                    {check.checked && <span className="text-success font-semibold">{t("Completed")}</span>}
                    {check.skipped && <span className="text-description font-semibold">{t("Skipped")}</span>}
                    {check.xpGenerated > 0 && <span className="text-primary font-semibold">+{check.xpGenerated} XP</span>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!check.checked && (
                    <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-semibold text-description hover:text-primary transition-colors duration-200"
                        onClick={() => onSkip(check)}
                        aria-label={check.skipped ? t("Undo skip") : t("Skip")}
                    >
                        <FiSlash />
                        {check.skipped ? t("Undo skip") : t("Skip")}
                    </button>
                )}
                <input
                    type="checkbox"
                    className="h-5 w-5 accent-primary cursor-pointer"
                    checked={check.checked}
                    onChange={() => onCheck(check)}
                />
            </div>
        </div>
    );
};

const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-secondary">
        {children}
    </span>
);
