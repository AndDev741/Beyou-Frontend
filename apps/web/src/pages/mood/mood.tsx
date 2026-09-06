import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { BookHeart, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { deleteMoodEntry, saveMoodEntry, setMoodLevel } from "@beyou/api/mood/moodApi";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import {
    MOOD_LEVELS,
    addDays,
    averageMood,
    journalStreak,
    monthGrid,
    monthRange,
    moodLabelKey,
    nearestLevel,
    removeMoodEntry,
    upsertMoodEntry,
    weekEnding,
} from "@beyou/state";
import { MAX_MOOD_NOTE_LENGTH, type MoodLevel } from "@beyou/types/mood/mood";
import useAuthGuard from "../../components/useAuthGuard";
import useMoodRange from "../../hooks/useMoodRange";
import useTodayInZone from "../../hooks/useTodayInZone";
import PageHeader from "../../ui/PageHeader";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/modals/Modal";
import { MOOD_FACES } from "../../components/mood/moodScale";

/** How many past entries the list shows before it stops being a list and becomes a wall. */
const RECENT_SHOWN = 14;

export default function Mood() {
    useAuthGuard();

    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const today = useTodayInZone();
    const [params, setParams] = useSearchParams();

    // The day on screen. Never in the future: a link with ?date=2099-01-01 lands on today
    // rather than on a day the server would refuse to write.
    const requested = params.get("date");
    const selected = requested && requested <= today ? requested : today;

    const [month, setMonth] = useState(() => selected.slice(0, 7));
    const [year, monthIndex] = useMemo(() => {
        const [y, m] = month.split("-").map(Number);
        return [y, m - 1];
    }, [month]);

    const range = useMemo(() => monthRange(year, monthIndex), [year, monthIndex]);
    const { byDate, loading, refresh } = useMoodRange(range.from, range.to);
    // The streak and the week average look back across the month boundary, so they read a
    // second window rather than reporting a short run on the first of the month.
    const trailing = useMoodRange(addDays(today, -60), today);

    const entry = byDate[selected] ?? trailing.byDate[selected];
    const [draft, setDraft] = useState(entry?.note ?? "");
    const [savingNote, setSavingNote] = useState(false);
    const [savingLevel, setSavingLevel] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
    const deleteTitleId = useId();
    /** Which day the textarea currently reflects. See the seeding effect below. */
    const dayShown = useRef<string | null>(null);

    /**
     * Seeds the textarea from the stored entry.
     *
     * Keyed on the day ALONE, this was a data-loss bug: on first mount the day's entry has not
     * arrived, so the box seeded empty and never re-seeded, and the page showed a blank journal
     * for a day that had one. Pressing Save then sent `note: null` and deleted it — the exact
     * failure the PATCH/PUT split exists to prevent, reintroduced one layer up.
     *
     * So it also runs when the entry itself arrives or changes. The one thing it must not do is
     * replace text somebody has typed with nothing, which is what a late-arriving empty entry
     * would otherwise do; `dayShown` is how it tells "new day" from "same day, data landed".
     */
    useEffect(() => {
        const stored = entry?.note ?? "";
        setDraft((current) => {
            if (dayShown.current === selected && current !== "" && stored === "") return current;
            dayShown.current = selected;
            return stored;
        });
    }, [selected, entry?.id, entry?.note]);

    const selectDay = useCallback(
        (day: string) => {
            if (day > today) return;
            const next = new URLSearchParams(params);
            next.set("date", day);
            setParams(next, { replace: true });
            setMonth(day.slice(0, 7));
        },
        [params, setParams, today],
    );

    const pickLevel = async (mood: MoodLevel) => {
        if (savingLevel) return;
        setSavingLevel(true);
        const response = await setMoodLevel(selected, mood, t);
        setSavingLevel(false);
        if (response.success) {
            dispatch(upsertMoodEntry(response.success));
            return;
        }
        toast.error(getFriendlyErrorMessage(t, response.error));
    };

    const saveNote = async () => {
        if (!entry) {
            toast.info(t("MoodNoteRequiresMood"));
            return;
        }
        setSavingNote(true);
        const trimmed = draft.trim();
        const response = await saveMoodEntry(
            selected,
            { mood: entry.mood, note: trimmed === "" ? null : trimmed },
            t,
        );
        setSavingNote(false);
        if (response.success) {
            dispatch(upsertMoodEntry(response.success));
            toast.success(t("MoodJournalSaved"));
            return;
        }
        toast.error(getFriendlyErrorMessage(t, response.error));
    };

    const confirmDelete = async () => {
        const day = confirmingDelete;
        if (!day) return;
        const response = await deleteMoodEntry(day, t);
        setConfirmingDelete(null);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        dispatch(removeMoodEntry(day));
        toast.success(t("MoodEntryDeleted"));
        refresh();
        trailing.refresh();
    };

    const allEntries = useMemo(
        () =>
            Object.values({ ...trailing.byDate, ...byDate })
                .filter((item) => item.date <= today)
                .sort((a, b) => b.date.localeCompare(a.date)),
        [byDate, trailing.byDate, today],
    );
    const streak = useMemo(() => journalStreak(allEntries, today), [allEntries, today]);
    const weekAverage = useMemo(() => {
        const week = weekEnding(today);
        return averageMood(allEntries.filter((item) => week.includes(item.date)));
    }, [allEntries, today]);

    const cells = useMemo(() => monthGrid(year, monthIndex), [year, monthIndex]);
    const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" });
    const longDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: "full" });
    const shortDate = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
    const weekdayNarrow = new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" });
    // A fixed week starting on Sunday, to label the grid's columns.
    const weekdayHeads = Array.from({ length: 7 }, (_, index) =>
        weekdayNarrow.format(new Date(Date.UTC(2026, 1, 1 + index))),
    );

    const shiftMonth = (delta: number) => {
        const next = new Date(Date.UTC(year, monthIndex + delta, 1));
        setMonth(next.toISOString().slice(0, 7));
    };

    return (
        <main className="mx-auto w-full max-w-[880px] px-4 py-6 sm:px-6">
            <PageHeader
                title={t("MoodPageTitle")}
                subtitle={
                    streak > 0
                        ? t("MoodStreak", { count: streak })
                        : t("MoodPageSubtitle")
                }
            />

            <section
                className="rounded-card border border-border bg-surface p-5"
                aria-labelledby="mood-day-heading"
            >
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => selectDay(addDays(selected, -1))}
                        aria-label={t("MoodPreviousDay")}
                        data-testid="mood-previous-day"
                        className="rounded-control border border-border p-1.5 text-text-2 hover:bg-surface-2"
                    >
                        <ChevronLeft size={16} aria-hidden="true" />
                    </button>
                    <h2 id="mood-day-heading" className="text-sm font-semibold text-text">
                        {selected === today
                            ? t("MoodToday")
                            : longDate.format(new Date(`${selected}T12:00:00`))}
                    </h2>
                    <button
                        type="button"
                        onClick={() => selectDay(addDays(selected, 1))}
                        disabled={selected >= today}
                        aria-label={t("MoodNextDay")}
                        data-testid="mood-next-day"
                        className="rounded-control border border-border p-1.5 text-text-2 hover:bg-surface-2 disabled:opacity-40"
                    >
                        <ChevronRight size={16} aria-hidden="true" />
                    </button>
                </div>

                <div
                    className="mt-4 flex items-center justify-center gap-3 sm:gap-5"
                    role="group"
                    aria-label={t("MoodScaleLabel")}
                    data-testid="mood-scale"
                >
                    {MOOD_LEVELS.map((level) => {
                        const { Icon, text } = MOOD_FACES[level];
                        const chosen = entry?.mood === level;
                        return (
                            <button
                                key={level}
                                type="button"
                                onClick={() => pickLevel(level)}
                                disabled={savingLevel}
                                aria-label={t(moodLabelKey(level))}
                                aria-pressed={chosen}
                                data-testid={`mood-scale-${level}`}
                                className={`flex flex-col items-center gap-1.5 rounded-control p-2 transition-colors disabled:opacity-60 ${
                                    chosen ? "bg-surface-2" : "hover:bg-surface-2"
                                }`}
                            >
                                <span className={text}>
                                    <Icon size={38} aria-hidden="true" />
                                </span>
                                <span
                                    className={`text-[11.5px] ${chosen ? "font-semibold text-text" : "text-text-3"}`}
                                >
                                    {t(moodLabelKey(level))}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {weekAverage !== null && (
                    <p className="mt-3 text-center text-[12.5px] text-text-2">
                        {t("MoodWeekAverage", {
                            mood: t(moodLabelKey(nearestLevel(weekAverage))).toLowerCase(),
                        })}
                    </p>
                )}
            </section>

            <section
                className="mt-4 rounded-card border border-border bg-surface p-5"
                aria-labelledby="mood-journal-heading"
            >
                <h2
                    id="mood-journal-heading"
                    className="flex items-center gap-2 text-[12.5px] font-semibold text-text-2"
                >
                    <BookHeart size={14.5} aria-hidden="true" className="text-text-3" />
                    {t("MoodJournalTitle")}
                </h2>
                <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, MAX_MOOD_NOTE_LENGTH))}
                    placeholder={t("MoodJournalPlaceholder")}
                    aria-label={t("MoodJournalTitle")}
                    data-testid="mood-note"
                    rows={7}
                    className="mt-3 w-full resize-y rounded-control border border-border bg-bg p-3 text-sm text-text transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11.5px] text-text-3">
                        {t("MoodJournalCharacters", {
                            count: draft.length,
                            max: MAX_MOOD_NOTE_LENGTH,
                        })}
                    </span>
                    <Button
                        text={t("MoodJournalSave")}
                        size="auto"
                        mode="primary"
                        onClick={saveNote}
                        disabled={savingNote}
                        testId="mood-save-note"
                    />
                </div>
            </section>

            <section
                className="mt-4 rounded-card border border-border bg-surface p-5"
                aria-labelledby="mood-month-heading"
            >
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        aria-label={t("MoodPreviousMonth")}
                        className="rounded-control border border-border p-1.5 text-text-2 hover:bg-surface-2"
                    >
                        <ChevronLeft size={16} aria-hidden="true" />
                    </button>
                    <h2 id="mood-month-heading" className="text-sm font-semibold text-text">
                        {monthLabel.format(new Date(Date.UTC(year, monthIndex, 1)))}
                    </h2>
                    <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        disabled={month >= today.slice(0, 7)}
                        aria-label={t("MoodNextMonth")}
                        className="rounded-control border border-border p-1.5 text-text-2 hover:bg-surface-2 disabled:opacity-40"
                    >
                        <ChevronRight size={16} aria-hidden="true" />
                    </button>
                </div>

                <div className="mt-3 grid grid-cols-7 gap-1.5" data-testid="mood-month">
                    {weekdayHeads.map((head, index) => (
                        <span
                            key={`head-${index}`}
                            aria-hidden="true"
                            className="pb-1 text-center text-[10.5px] text-text-3"
                        >
                            {head}
                        </span>
                    ))}
                    {cells.map((day, index) => {
                        if (!day) return <span key={`pad-${index}`} aria-hidden="true" />;
                        const dayEntry = byDate[day];
                        const face = dayEntry ? MOOD_FACES[dayEntry.mood] : null;
                        const future = day > today;
                        const label = `${shortDate.format(new Date(`${day}T12:00:00`))}: ${
                            dayEntry ? t(moodLabelKey(dayEntry.mood)) : t("MoodNotRecorded")
                        }`;
                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => selectDay(day)}
                                disabled={future}
                                aria-label={label}
                                aria-current={day === selected ? "date" : undefined}
                                data-testid={`mood-day-${day}`}
                                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-control border text-[11px] transition-colors disabled:opacity-30 ${
                                    day === selected
                                        ? "border-accent bg-surface-2"
                                        : "border-transparent hover:bg-surface-2"
                                }`}
                            >
                                <span className={future ? "text-text-3" : "text-text-2"}>
                                    {Number(day.slice(8))}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className={`h-1.5 w-1.5 rounded-full ${face ? face.fill : "bg-transparent"}`}
                                />
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="mt-4" aria-labelledby="mood-recent-heading">
                <h2
                    id="mood-recent-heading"
                    className="mb-2.5 text-[12.5px] font-semibold text-text-2"
                >
                    {t("MoodRecentTitle")}
                </h2>
                {allEntries.length === 0 && !loading ? (
                    <EmptyState
                        icon={<BookHeart size={20} aria-hidden="true" />}
                        title={t("MoodNoEntriesTitle")}
                        description={t("MoodNoEntriesDescription")}
                        testId="mood-empty-state"
                    />
                ) : (
                    <ul className="flex flex-col gap-2" data-testid="mood-recent">
                        {allEntries.slice(0, RECENT_SHOWN).map((item) => {
                            const { Icon, text } = MOOD_FACES[item.mood];
                            return (
                                <li
                                    key={item.date}
                                    className="flex items-start gap-3 rounded-card border border-border bg-surface p-3.5"
                                >
                                    <span className={`mt-0.5 shrink-0 ${text}`}>
                                        <Icon size={22} aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0 grow">
                                        <button
                                            type="button"
                                            onClick={() => selectDay(item.date)}
                                            className="text-[12.5px] font-semibold text-text hover:underline"
                                        >
                                            {shortDate.format(new Date(`${item.date}T12:00:00`))}
                                        </button>
                                        <span className="ml-2 text-[11.5px] text-text-3">
                                            {t(moodLabelKey(item.mood))}
                                        </span>
                                        {item.note && (
                                            <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] text-text-2">
                                                {item.note}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingDelete(item.date)}
                                        aria-label={t("MoodDeleteEntry")}
                                        data-testid={`mood-delete-${item.date}`}
                                        className="shrink-0 rounded-control p-1.5 text-text-3 hover:bg-surface-2 hover:text-danger"
                                    >
                                        <Trash2 size={15} aria-hidden="true" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {/* The shared DeleteModal is bound to the four entity domains — it needs an id, an
                edit slice and a list-refetch service, none of which a day has. This is the same
                base Modal it builds on, so the focus trap, Escape and aria-labelledby are the
                same; only the body differs. */}
            <Modal
                isOpen={confirmingDelete !== null}
                onClose={() => setConfirmingDelete(null)}
                labelledBy={deleteTitleId}
                className="w-[min(420px,92vw)] rounded-card border border-border bg-surface p-5"
            >
                <h2 id={deleteTitleId} className="text-sm font-semibold text-text">
                    {t("MoodDeleteEntry")}
                </h2>
                <p className="mt-2 text-[12.5px] text-text-2">
                    {confirmingDelete &&
                        t("MoodDeleteConfirm", {
                            date: shortDate.format(new Date(`${confirmingDelete}T12:00:00`)),
                        })}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        text={t("Cancel")}
                        size="auto"
                        mode="ghost"
                        onClick={() => setConfirmingDelete(null)}
                    />
                    <Button
                        text={t("Delete")}
                        size="auto"
                        mode="danger"
                        onClick={confirmDelete}
                        testId="mood-confirm-delete"
                    />
                </div>
            </Modal>
        </main>
    );
}
