import { useTranslation } from "react-i18next";
import { RoutineSection as section } from "@beyou/types/routine/routineSection";
import BeyouIcon from "../../../ui/BeyouIcon";
import { useSelector } from "react-redux";
import { RootState } from "@beyou/state/rootReducer";
import { itemGroupToCheck } from "@beyou/types/routine/itemGroupToCheck";
import { itemGroupToSkip } from "@beyou/types/routine/itemGroupToSkip";
import checkRoutine from "@beyou/api/routine/checkItem";
import skipRoutine from "@beyou/api/routine/skipItem";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import useUiRefresh from "../../../hooks/useUiRefresh";
import { formatTimeRange, getSectionStats } from "@beyou/state";
import { FiSlash, FiChevronDown } from "react-icons/fi";
import { toast } from "react-toastify";
import { notify } from "../../../lib/notify";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import XpFloat from "./XpFloat";
import Ring from "../../../ui/Ring";

const XP_FLOAT_DURATION_MS = 1200;
const COLLAPSED_STORAGE_KEY = "beyou-routine-collapsed";

/** Collapsed sections, per day: { "2026-08-04": ["section-a", "section-b"] }. */
function readCollapsed(date: string, sectionId: string): boolean {
    try {
        const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
        if (!raw) return false;
        const map = JSON.parse(raw) as Record<string, string[]>;
        return map[date]?.includes(sectionId) ?? false;
    } catch {
        return false;
    }
}

function writeCollapsed(date: string, sectionId: string, collapsed: boolean) {
    try {
        const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
        const list = (map[date] ?? []).filter((id) => id !== sectionId);
        if (collapsed) list.push(sectionId);
        // Only today is kept: past days have no reader, and letting the map grow
        // forever eventually blows the storage quota (it bites the native side
        // first, where the whole map shares one ~2KB SecureStore value).
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify({ [date]: list }));
    } catch {
        /* storage unavailable — the choice lasts only for this session */
    }
}

export default function RoutineSection({ section, routineId}: { section: section, routineId: string }) {
    const { t } = useTranslation();

    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});
    const [xpFloats, setXpFloats] = useState<Record<string, number>>({});
    // Guards check AND skip: both round-trip and both flip the same row.
    const [pending, setPending] = useState(false);
    const xpFloatTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    useEffect(() => {
        const timers = xpFloatTimers.current;
        return () => { timers.forEach(clearTimeout); };
    }, []);

    const allHabits = useSelector((state: RootState) => state.habits.habits);
    const allTasks = useSelector((state: RootState) => state.tasks.tasks);

    useUiRefresh(refreshUi);

    const getMergedItems = () => {
        // Only groups the backend knows: checking needs the group id, so one
        // without it could not round-trip anyway. Filtering here is also what
        // lets the rest of this function drop `any`.
        const tasks = (section.taskGroup ?? [])
            .filter((item): item is typeof item & { id: string } => Boolean(item.id))
            .map(item => ({
                type: 'task' as const,
                id: item.taskId,
                groupId: item.id,
                startTime: item?.startTime,
                endTime: item?.endTime,
                check: item?.taskGroupChecks
            }));

        const habits = (section.habitGroup ?? [])
            .filter((item): item is typeof item & { id: string } => Boolean(item.id))
            .map(item => ({
                type: 'habit' as const,
                id: item.habitId,
                groupId: item.id,
                startTime: item?.startTime,
                endTime: item?.endTime,
                check: item?.habitGroupChecks
            }));

        return [...tasks, ...habits].sort((a, b) =>
            a?.startTime ? a.startTime.localeCompare(b.startTime) : 0 - (b?.startTime ? b.startTime.localeCompare(a.startTime) : 0)
        );
    };

     /**
      * One toggle in flight at a time. A double click on the ring ran it twice:
      * XP granted then revoked, two toasts, the item back unchecked, and the two
      * XpFloat timers racing. The native item guards the same way (`pending`).
      */
     const handleCheck = async (groupToCheck: itemGroupToCheck) => {
        if (pending) return;
        setPending(true);
        const refreshUiReponse = await checkRoutine(groupToCheck, t);
        if(refreshUiReponse?.success){
            setRefreshUi(refreshUiReponse.success);
            const itemChecked = refreshUiReponse.success.refreshItemChecked;
            const xpGenerated = itemChecked?.check?.xpGenerated;
            if (itemChecked && xpGenerated && itemChecked.check.checked) {
                const groupItemId = itemChecked.groupItemId;
                setXpFloats(prev => ({ ...prev, [groupItemId]: xpGenerated }));
                const timerId = setTimeout(() => {
                    xpFloatTimers.current.delete(timerId);
                    setXpFloats(prev => {
                        const { [groupItemId]: _removed, ...rest } = prev;
                        return rest;
                    });
                }, XP_FLOAT_DURATION_MS);
                xpFloatTimers.current.add(timerId);
            }
        } else if (refreshUiReponse?.error) {
            toast.error(getFriendlyErrorMessage(t, refreshUiReponse.error));
        }
        setPending(false);
     }

     const handleSkip = async (groupToSkip: itemGroupToSkip) => {
        if (pending) return;
        setPending(true);
        const refreshUiReponse = await skipRoutine(groupToSkip, t);
        if(refreshUiReponse?.success){
            setRefreshUi(refreshUiReponse.success);
        } else if (refreshUiReponse?.error) {
            toast.error(getFriendlyErrorMessage(t, refreshUiReponse.error));
        }
        setPending(false);
     }

    const mergedItems = getMergedItems();

    // Collapsing is per day: finishing the morning section buys back its space
    // today, and tomorrow the section is open again.
    const today = new Date().toJSON().slice(0, 10);
    const sectionId = section.id || section.name;
    const [collapsed, setCollapsed] = useState(() => readCollapsed(today, sectionId));
    const sectionXp = useMemo(() => getSectionStats(section, today).xpEarned, [section, today]);

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            writeCollapsed(today, sectionId, !prev);
            return !prev;
        });
    };

    const renderItems = () => {
        return mergedItems.map((item, index) => {
            // The guard had to come BEFORE the spread. As it was, `itemObj` was
            // reassigned to `{ ...undefined, item }` when the habit or task was
            // not in the store — a truthy object — so `if (!itemObj)` never
            // fired and the row rendered with no name and no icon instead of
            // being skipped.
            const found =
                item.type === 'task'
                    ? allTasks?.find(task => task.id === item.id)
                    : allHabits?.find(habit => habit.id === item.id);

            if (!found) return null;

            const itemObj = { ...found, item };

            let currentDate = new Date().toJSON().slice(0, 10);
            const ItemCheck = item.check?.find((check) => check?.checkDate === currentDate);
            const checked: boolean = ItemCheck?.checked === true ? true : false;
            const skipped: boolean = ItemCheck?.skipped === true && !checked;
            // The XP stays ON THE ROW once done (XpFloat only marks the moment
            // of the check and leaves). It comes from the check itself, so it
            // survives a reload and shows the real value, decay included.
            const xpEarned: number = checked ? (ItemCheck?.xpGenerated ?? 0) : 0;
            // Only habits carry one; `in` narrows the union without a cast.
            const motivationalPhrase =
                'motivationalPhrase' in itemObj ? itemObj.motivationalPhrase : '';

            return (
                <div key={`${item.type}-${item.id}-${index}`} className={`group mt-1 flex w-full items-center gap-2.5 rounded-control px-1.5 py-1.5 transition-colors duration-200 hover:bg-surface-2 lg:px-2 ${skipped ? "opacity-60" : ""}`}>
                    <div className="relative flex shrink-0 items-center">
                        {xpFloats[itemObj.item.groupId] !== undefined && (
                            <XpFloat xp={xpFloats[itemObj.item.groupId]} />
                        )}
                        <label className="flex items-center justify-center min-w-[44px] min-h-[44px] -my-2 -ml-2 cursor-pointer">
                        {/* The input stays the real target (keyboard, screen reader,
                            e2e); the ring is the drawing on top of it. */}
                        <input
                            type="checkbox"
                            aria-label={itemObj.name}
                            className="peer sr-only"
                            checked={checked}
                            onChange={() => {
                                const groupToCheck: itemGroupToCheck = {
                                    routineId: routineId,
                                    ...(item.type === 'task'
                                        ? {
                                            taskGroupDTO: {
                                                taskGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                        : {
                                            habitGroupDTO: {
                                                habitGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                    )
                                };
                                handleCheck(groupToCheck);
                                if (!checked) {
                                    // The motivational phrase comes with the
                                    // habit's own icon: a generic check does not
                                    // say what got done.
                                    notify.success(itemObj.name || t("Item completed"), {
                                        subtitle: motivationalPhrase || undefined,
                                        icon: <BeyouIcon id={itemObj.iconId} size={16} />,
                                    });
                                }
                            }}
                        />
                        <Ring
                            size={26}
                            state={checked ? "done" : skipped ? "skipped" : "todo"}
                            className="transition-transform duration-200 group-hover:scale-105 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface rounded-full"
                        />
                        </label>
                    </div>

                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent-soft text-accent">
                        <BeyouIcon id={itemObj.iconId} />
                    </span>

                    {/* On phones the row breaks in two: metadata on top, name
                        below at full width. On one line, name + XP + time + skip do
                        not fit in 390px and the right-hand column ran off screen.
                        `flex-col-reverse` flips only the VISUAL — the name still
                        comes first in the DOM, which is what the screen reader and
                        the e2e suite read.
                        The skipped state is conveyed by the dimmed row, the
                        line-through name and the undo button — no extra label. */}
                    <div className="flex min-w-0 flex-1 flex-col-reverse gap-1 lg:flex-row lg:items-center lg:gap-3">
                        <span
                            className={`line-clamp-2 text-[13.5px] font-medium lg:line-clamp-1 ${
                                checked || skipped ? "text-text-3" : "text-text"
                            } ${skipped ? "line-through" : ""}`}
                        >
                            {itemObj.name}
                        </span>

                        <div className="flex shrink-0 items-center gap-1.5 lg:ml-auto lg:gap-2">
                        {xpEarned > 0 && (
                            <span className="rounded-full bg-xp-soft px-2.5 py-0.5 font-mono text-xs font-semibold text-xp">
                                +{xpEarned} XP
                            </span>
                        )}
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] font-medium text-text-3">
                            {formatTimeRange(item.startTime, item.endTime)}
                        </span>
                    {!checked && (
                        <button
                            aria-label={skipped ? t("Undo skip") : t("Skip")}
                            title={skipped ? t("Undo skip") : t("Skip")}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                            onClick={() => {
                                const groupToSkip: itemGroupToSkip = {
                                    routineId: routineId,
                                    skip: !skipped,
                                    ...(item.type === 'task'
                                        ? {
                                            taskGroupDTO: {
                                                taskGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                        : {
                                            habitGroupDTO: {
                                                habitGroupId: itemObj.item.groupId,
                                                startTime: item.startTime
                                            }
                                        }
                                    )
                                };
                                handleSkip(groupToSkip);
                            }}
                        >
                            <FiSlash size={13} aria-hidden="true" />
                            {skipped ? t("Undo skip") : t("Skip")}
                        </button>
                    )}
                        </div>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="flex w-full flex-col items-start justify-center pb-1 pt-2.5">
            {/* w-full, not the parent's `items-start` intrinsic width: without it the
                row sizes to its content, and on a phone a long section name pushed the
                chevron past the card's right edge instead of shortening the name. */}
            <div className="flex w-full items-center gap-2.5 py-1.5">
                <span className="shrink-0 text-[15px] text-text-3">
                    <BeyouIcon id={section.iconId} />
                </span>
                <b className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-text-2">{section.name}</b>
                <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-text-3">
                    {formatTimeRange(section.startTime, section.endTime)}
                </span>

                {sectionXp > 0 && (
                    <span className="ml-1 shrink-0 rounded-full bg-xp-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-xp">
                        +{sectionXp} XP
                    </span>
                )}

                {/* Collapsing a section buys space back for the day; the state is kept
                    per day in localStorage — tomorrow it opens fresh. */}
                <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? t("Expand") : t("Collapse")}
                    className="ml-auto shrink-0 rounded-lg p-1 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                >
                    <FiChevronDown
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                    />
                </button>
            </div>

            {!collapsed && (
                <div className="mb-2 flex w-full flex-col items-start justify-start">
                    {renderItems()}
                </div>
            )}
        </div>
    )
}
