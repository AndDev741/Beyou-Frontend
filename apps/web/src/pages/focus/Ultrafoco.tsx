import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
// Same skip glyph the routine rows already use (`routineSection.tsx`); lucide has no Slash.
import { FiSlash } from "react-icons/fi";
import type { RootState } from "@beyou/state/rootReducer";
import {
    FOCUS_REASON_LABEL_KEY,
    formatTimeRange,
    isFocusItemChecked,
    isFocusItemSkipped,
    reasonIsFromClock,
    type FocusItem,
} from "@beyou/state";
import type { itemGroupToCheck } from "@beyou/types/routine/itemGroupToCheck";
import type { itemGroupToSkip } from "@beyou/types/routine/itemGroupToSkip";
import type { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import BeyouIcon from "../../ui/BeyouIcon";
import XpFloat from "../../components/dashboard/dayRoutine/XpFloat";
import { useRoutineCheckin } from "../../hooks/useRoutineCheckin";
import { useFocusSelection } from "./useFocusSelection";
import Pomodoro from "./Pomodoro";
import useTodayInZone from "../../hooks/useTodayInZone";

/** Same lifetime as the dashboard row's float, so the two screens feel like one system. */
const XP_FLOAT_DURATION_MS = 1200;

/**
 * One item at a time.
 *
 * The freedom rule shapes this whole component. The clock seeds which item opens and then has
 * no further say: the arrows and the picker work in both directions at any hour, an item whose
 * window has passed is reachable, and an item whose window has not arrived can be checked
 * right now. There is no disabled state anywhere that depends on the time, and no warning that
 * says the person is doing this at the wrong moment.
 *
 * That costs nothing on the server, which is the pleasant part: `CheckItemService` resolves a
 * check by group id and stamps the owner's local day. The `startTime` the DTO carries is never
 * read, so checking at an unscheduled hour is already an ordinary, legal operation.
 */
export default function Ultrafoco({ routine }: { routine: NonNullable<RootState["todayRoutine"]["routine"]> }) {
    const { t } = useTranslation();
    // The OWNER's day, not the UTC one. `toJSON()` is UTC, and checks are stamped in the user's
    // timezone, so in Brazil after 21:00 a checked item read as open and the done panel never
    // arrived. Re-read when the day actually turns.
    const today = useTodayInZone();
    const { check, skip } = useRoutineCheckin();
    const [pending, setPending] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    // The XP comes from the check RESPONSE, never from the store. `todayRoutineSlice` keeps the
    // `xpGenerated` it already had on a row and does not patch a LIST routine's `items[]`, so
    // reading it back from there showed nothing on the first check. Both pieces are keyed by
    // group id: the person can step to another item while the float is still in the air.
    const [xpFloat, setXpFloat] = useState<{ groupId: string; xp: number } | null>(null);
    const [xpEarned, setXpEarned] = useState<Record<string, number>>({});
    const floatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => { if (floatTimer.current) clearTimeout(floatTimer.current); }, []);

    const allHabits = useSelector((state: RootState) => state.habits.habits);
    const allTasks = useSelector((state: RootState) => state.tasks.tasks);

    const {
        items,
        current,
        index,
        reason,
        select,
        next,
        previous,
        canGoNext,
        canGoPrevious,
    } = useFocusSelection(routine, today);

    const resolve = (item: FocusItem) =>
        item.type === "habit"
            ? allHabits?.find((habit) => habit.id === item.itemId)
            : allTasks?.find((task) => task.id === item.itemId);

    if (items.length === 0) {
        return (
            <div className="rounded-card border border-border bg-surface px-4 py-10 text-center" data-testid="focus-ultra-empty">
                <p className="text-base font-semibold text-text">{t("FocusNothingHere")}</p>
                <p className="mt-1 text-sm text-text-3">{t("FocusNothingHereHint")}</p>
            </div>
        );
    }

    if (!current) {
        // Every item is checked or skipped. Said as an accomplishment, with no "but you
        // skipped three of them" attached to it.
        return (
            <div className="rounded-card border border-border bg-surface px-4 py-10 text-center" data-testid="focus-ultra-done">
                <p className="text-base font-semibold text-text">{t("FocusDayDone")}</p>
                <p className="mt-1 text-sm text-text-3">{t("FocusDayDoneHint")}</p>
            </div>
        );
    }

    const found = resolve(current);
    const checked = isFocusItemChecked(current, today);
    const skipped = isFocusItemSkipped(current, today);
    const window = formatTimeRange(current.startTime, current.endTime);

    const groupDto = <T extends itemGroupToCheck | itemGroupToSkip>(extra: Partial<T>): T =>
        ({
            routineId: routine.id!,
            ...(current.type === "task"
                ? // `startTime` is required by the type but never read by the server: the check
                  // resolves the group by id. A LIST item has no time at all, hence the "".
                  { taskGroupDTO: { taskGroupId: current.groupId, startTime: current.startTime ?? "" } }
                : { habitGroupDTO: { habitGroupId: current.groupId, startTime: current.startTime ?? "" } }),
            ...extra,
        }) as T;

    /** One call in flight at a time: a double click granted then revoked the XP. */
    const guard = async (run: () => Promise<unknown>) => {
        if (pending) return;
        setPending(true);
        try {
            await run();
        } finally {
            setPending(false);
        }
    };

    /**
     * A completion shows its XP twice: a float for the instant, and a chip that stays under the
     * item for as long as it is done. An undo, or a skip that cleared a check, takes the chip
     * away. A response with no item (a failed call returns null) changes nothing.
     */
    const showXp = (result: RefreshUI | null) => {
        const itemChecked = result?.refreshItemChecked;
        if (!itemChecked) return;
        const { groupItemId, check: checkResult } = itemChecked;
        if (checkResult.checked && checkResult.xpGenerated) {
            setXpEarned((previous) => ({ ...previous, [groupItemId]: checkResult.xpGenerated }));
            setXpFloat({ groupId: groupItemId, xp: checkResult.xpGenerated });
            if (floatTimer.current) clearTimeout(floatTimer.current);
            floatTimer.current = setTimeout(() => setXpFloat(null), XP_FLOAT_DURATION_MS);
            return;
        }
        setXpEarned((previous) => {
            if (!(groupItemId in previous)) return previous;
            const { [groupItemId]: _gone, ...rest } = previous;
            return rest;
        });
        // A quick undo lands while the float is still in the air, announcing XP that no longer
        // exists. Down it comes.
        setXpFloat((previous) => (previous?.groupId === groupItemId ? null : previous));
    };

    const earned = xpEarned[current.groupId];

    return (
        <div className="flex flex-col gap-2.5" data-testid="focus-ultra">
            {/* The day's counter and the jump list come FIRST, right under the screen's
                title and its actions: "which of the day am I on" is the orientation
                question, and it belongs above the item rather than buried under it. */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={previous}
                    disabled={!canGoPrevious}
                    aria-label={t("FocusPreviousItem")}
                    title={t("FocusPreviousItem")}
                    className="flex h-10 w-10 items-center justify-center rounded-control border border-border text-text-2 transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
                    data-testid="focus-ultra-prev"
                >
                    <ChevronLeft size={18} aria-hidden="true" />
                </button>

                <button
                    type="button"
                    onClick={() => setPickerOpen((open) => !open)}
                    aria-expanded={pickerOpen}
                    className="flex h-10 flex-1 items-center justify-center rounded-control border border-border text-[12.5px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                    data-testid="focus-ultra-picker-toggle"
                >
                    {`${index + 1} ${t("Of")} ${items.length}`}
                </button>

                <button
                    type="button"
                    onClick={next}
                    disabled={!canGoNext}
                    aria-label={t("FocusNextItem")}
                    title={t("FocusNextItem")}
                    className="flex h-10 w-10 items-center justify-center rounded-control border border-border text-text-2 transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
                    data-testid="focus-ultra-next"
                >
                    <ChevronRight size={18} aria-hidden="true" />
                </button>
            </div>

            {/* Any item of the day, in one tap, in any direction. This is the affordance that
                makes the freedom rule real rather than stated: without it, reaching this
                morning at eleven at night means pressing back eleven times. */}
            {pickerOpen && (
                <ul
                    className="max-h-72 overflow-y-auto rounded-card border border-border bg-surface p-1.5"
                    aria-label={t("FocusJumpTo")}
                    data-testid="focus-ultra-picker"
                >
                    {items.map((item, itemIndex) => {
                        const itemFound = resolve(item);
                        const itemChecked = isFocusItemChecked(item, today);
                        const itemSkipped = isFocusItemSkipped(item, today);
                        return (
                            <li key={item.groupId}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        select(itemIndex);
                                        setPickerOpen(false);
                                    }}
                                    aria-current={itemIndex === index}
                                    className={`flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-surface-2 ${
                                        itemIndex === index ? "bg-surface-2" : ""
                                    }`}
                                    data-testid={`focus-ultra-pick-${item.groupId}`}
                                >
                                    <BeyouIcon id={itemFound?.iconId ?? ""} size={16} />
                                    <span
                                        className={`min-w-0 flex-1 truncate text-[13px] ${
                                            itemChecked || itemSkipped ? "text-text-3 line-through" : "text-text"
                                        }`}
                                    >
                                        {itemFound?.name ?? item.itemId}
                                    </span>
                                    {item.startTime && (
                                        <span className="shrink-0 font-mono text-[11px] text-text-3">
                                            {formatTimeRange(item.startTime, item.endTime)}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="rounded-card border border-border bg-surface px-4 py-4 text-center lg:py-5">
                <div className="flex items-center justify-center gap-2">
                    <span
                        className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2"
                        data-testid="focus-ultra-reason"
                    >
                        {t(FOCUS_REASON_LABEL_KEY[reason])}
                    </span>
                    {current.sectionName && (
                        <span className="text-[11px] text-text-3">{current.sectionName}</span>
                    )}
                </div>

                <div className="mt-3 flex justify-center">
                    <BeyouIcon id={found?.iconId ?? ""} size={44} />
                </div>

                <h2 className="mt-2 text-xl font-semibold tracking-[-0.01em] text-text lg:text-2xl">
                    {found?.name ?? current.itemId}
                </h2>

                {/* A time is shown only when there is one, and only when the clock is what put
                    this item on screen. Over a LIST item it would invent a schedule. */}
                <p className="mt-1 font-mono text-[12.5px] text-text-3" data-testid="focus-ultra-window">
                    {window && reasonIsFromClock(reason) ? window : t("FocusAnyTime")}
                </p>

                {found && "motivationalPhrase" in found && found.motivationalPhrase ? (
                    <p className="mx-auto mt-2.5 max-w-md text-sm text-text-2">
                        {String(found.motivationalPhrase)}
                    </p>
                ) : null}

                {earned !== undefined && (
                    <div className="mt-2.5 flex justify-center">
                        <span
                            className="rounded-full bg-xp-soft px-2.5 py-0.5 font-mono text-xs font-semibold text-xp"
                            data-testid="focus-ultra-xp"
                        >
                            +{earned} XP
                        </span>
                    </div>
                )}

                <div className="mt-4 flex items-center justify-center gap-2.5">
                    {/* The wrapper is what the float is positioned against (it sits at -top-4). */}
                    <span className="relative inline-flex">
                        {xpFloat && xpFloat.groupId === current.groupId && <XpFloat xp={xpFloat.xp} />}
                        {/* Three states, and `checked` wins when both are set, as on the dashboard
                            row. A skipped item used to fall into the accent branch because the
                            ternary only knew "checked or not", which read as an item still
                            waiting to be done. */}
                        <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                                guard(async () =>
                                    showXp(
                                        await check(groupDto<itemGroupToCheck>({}), {
                                            wasChecked: checked,
                                            name: found?.name,
                                            motivationalPhrase:
                                                found && "motivationalPhrase" in found
                                                    ? (found.motivationalPhrase as string | undefined)
                                                    : undefined,
                                        })
                                    )
                                )
                            }
                            className={`inline-flex h-11 items-center justify-center gap-2 rounded-control px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
                                checked
                                    ? "bg-surface-2 text-text"
                                    : skipped
                                      ? "border border-border bg-surface text-text hover:bg-surface-2"
                                      : "bg-accent text-on-accent"
                            }`}
                            data-testid="focus-ultra-check"
                        >
                            <Check size={16} aria-hidden="true" />
                            {checked ? t("Undo") : t("Done")}
                        </button>
                    </span>

                    <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                            guard(async () => showXp(await skip(groupDto<itemGroupToSkip>({ skip: !skipped }))))
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                        data-testid="focus-ultra-skip"
                    >
                        <FiSlash size={15} aria-hidden="true" />
                        {skipped ? t("Undo") : t("Skip")}
                    </button>
                </div>
            </div>

            {/* The timer sits between the item and the navigation, so starting a cycle and then
                stepping to another item reads as two separate acts. */}
            <Pomodoro item={current} date={today} />

        </div>
    );
}
