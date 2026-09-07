import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { BookHeart, Check, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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

/** How many entries one page of the list holds. "Show more" adds another page. */
const RECENT_PAGE = 14;

const JOURNAL_OPEN_KEY = "beyou-mood-journal-open";
const LEVEL_FILTER_KEY = "beyou-mood-levels";

/**
 * `null` means "never chose"; `[]` means "chose to hide them all".
 *
 * The same distinction the goals horizons make, for the same reason: collapsing an empty array
 * to null would make hiding every level come back as "show everything" on the next mount, and
 * silently undo the choice.
 */
function readStoredLevels(): MoodLevel[] | null {
    try {
        const raw = localStorage.getItem(LEVEL_FILTER_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((level): level is MoodLevel =>
            (MOOD_LEVELS as readonly number[]).includes(level as number),
        );
    } catch {
        return null;
    }
}

function readJournalOpen(): boolean {
    try {
        return localStorage.getItem(JOURNAL_OPEN_KEY) !== "false";
    } catch {
        return true;
    }
}

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
    const [draft, setDraft] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [savingLevel, setSavingLevel] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
    const [journalOpen, setJournalOpen] = useState(readJournalOpen);
    const [activeLevels, setActiveLevels] = useState<MoodLevel[]>(
        () => readStoredLevels() ?? [...MOOD_LEVELS],
    );
    const [shown, setShown] = useState(RECENT_PAGE);
    const deleteTitleId = useId();
    /** Which day the textarea currently reflects. See the seeding effect below. */
    const dayShown = useRef<string | null>(null);

    /**
     * Seeds the textarea from the stored entry.
     *
     * Keyed on the day ALONE, this was a data-loss bug: on first mount the day's entry has not
     * arrived, so the box seeded empty and never re-seeded, and the page showed a blank journal
     * for a day that had one. Pressing Save then sent `note: null` and deleted it. So it also
     * runs when the entry itself arrives or changes.
     *
     * The `dayShown` comparison happens HERE, not inside the `setDraft` updater. React may call
     * an updater more than once for the same state, and while the ref was written inside it the
     * second call saw the first call's mutation, concluded "same day", and returned the PREVIOUS
     * day's text — so moving to another day kept the old entry on screen. An updater has to be
     * pure; the ref is written once, in the effect body.
     */
    useEffect(() => {
        const stored = entry?.note ?? "";
        const sameDay = dayShown.current === selected;
        dayShown.current = selected;
        // The one case for keeping what is on screen: the same day, text already typed, and an
        // entry that arrived carrying nothing. Everything else takes the stored value, including
        // the empty string that clears the box when the day changes.
        setDraft((current) => (sameDay && current !== "" && stored === "" ? current : stored));
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

    const toggleJournal = () => {
        setJournalOpen((open) => !open);
    };

    // Persisting in an effect rather than inside the updater, for the reason the seeding effect
    // above documents: an updater may run twice, and a write to storage is not something to do
    // twice per click.
    useEffect(() => {
        try {
            localStorage.setItem(JOURNAL_OPEN_KEY, String(journalOpen));
        } catch {
            /* storage unavailable — the choice lasts only for this visit */
        }
    }, [journalOpen]);

    useEffect(() => {
        try {
            localStorage.setItem(LEVEL_FILTER_KEY, JSON.stringify(activeLevels));
        } catch {
            /* storage unavailable — the choice lasts only for this visit */
        }
    }, [activeLevels]);

    const toggleLevel = (level: MoodLevel) => {
        setActiveLevels((prev) =>
            prev.includes(level) ? prev.filter((value) => value !== level) : [...prev, level],
        );
        setShown(RECENT_PAGE);
    };

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

    const countByLevel = useMemo(() => {
        const counts = new Map<MoodLevel, number>();
        for (const item of allEntries) counts.set(item.mood, (counts.get(item.mood) ?? 0) + 1);
        return counts;
    }, [allEntries]);
    const filtered = useMemo(
        () => allEntries.filter((item) => activeLevels.includes(item.mood)),
        [allEntries, activeLevels],
    );

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
        <div className="min-h-[calc(100vh-5rem)] w-full bg-bg px-4 py-6 text-text lg:min-h-[calc(100vh-6rem)] lg:px-7">
            <PageHeader
                title={t("MoodPageTitle")}
                subtitle={streak > 0 ? t("MoodStreak", { count: streak }) : t("MoodPageSubtitle")}
            />

            {/* Two columns from lg: the day and its month on the left, the writing and what was
                written on the right. `items-start` so a long entry list does not stretch the
                calendar to match it. */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <div className="flex min-w-0 flex-col gap-4">
                    <section
                        className="rounded-card border border-border bg-surface p-4 sm:p-5"
                        aria-labelledby="mood-day-heading"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => selectDay(addDays(selected, -1))}
                                aria-label={t("MoodPreviousDay")}
                                data-testid="mood-previous-day"
                                className="shrink-0 rounded-control border border-border p-1.5 text-text-2 hover:bg-surface-2"
                            >
                                <ChevronLeft size={16} aria-hidden="true" />
                            </button>
                            <h2
                                id="mood-day-heading"
                                className="min-w-0 truncate text-center text-sm font-semibold text-text"
                            >
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
                                className="shrink-0 rounded-control border border-border p-1.5 text-text-2 hover:bg-surface-2 disabled:opacity-40"
                            >
                                <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </div>

                        {/* Each face takes an equal share of the row rather than a fixed width,
                            so five labels never run into the card's edge on a narrow phone —
                            which is exactly what they did before. */}
                        <div
                            className="mt-4 flex items-start gap-1 sm:gap-2"
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
                                        className={`flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 rounded-control px-0.5 py-2 transition-colors disabled:opacity-60 sm:px-2 ${
                                            chosen ? "bg-surface-2" : "hover:bg-surface-2"
                                        }`}
                                    >
                                        <span className={text}>
                                            <Icon size={32} aria-hidden="true" />
                                        </span>
                                        <span
                                            className={`max-w-full truncate text-[10.5px] sm:text-[11.5px] ${
                                                chosen ? "font-semibold text-text" : "text-text-3"
                                            }`}
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
                        className="rounded-card border border-border bg-surface p-4 sm:p-5"
                        aria-labelledby="mood-month-heading"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => shiftMonth(-1)}
                                aria-label={t("MoodPreviousMonth")}
                                className="shrink-0 rounded-control border border-border p-1.5 text-text-2 hover:bg-surface-2"
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
                                className="shrink-0 rounded-control border border-border p-1.5 text-text-2 hover:bg-surface-2 disabled:opacity-40"
                            >
                                <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-3 grid grid-cols-7 gap-1" data-testid="mood-month">
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
                                const FaceIcon = face?.Icon;
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
                                        className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-control border transition-colors disabled:opacity-30 ${
                                            day === selected
                                                ? "border-accent bg-surface-2"
                                                : "border-transparent hover:bg-surface-2"
                                        }`}
                                    >
                                        <span
                                            className={`text-[10.5px] leading-none ${
                                                future ? "text-text-3" : "text-text-2"
                                            }`}
                                        >
                                            {Number(day.slice(8))}
                                        </span>
                                        {/* The day's own face rather than a coloured dot: the
                                            same five icons the scale uses, so a month reads in
                                            the language the rest of the page already speaks.
                                            The empty span keeps every cell the same height. */}
                                        {FaceIcon && face ? (
                                            <span className={face.text} aria-hidden="true">
                                                <FaceIcon size={18} />
                                            </span>
                                        ) : (
                                            <span className="h-[18px]" aria-hidden="true" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    <section
                        className="rounded-card border border-border bg-surface p-4 sm:p-5"
                        aria-labelledby="mood-journal-heading"
                    >
                        {/* Collapsible, because somebody comparing a month of faces does not want
                            nine rows of textarea between them and the calendar. The choice is
                            remembered so it does not have to be made on every visit. */}
                        <button
                            type="button"
                            onClick={toggleJournal}
                            aria-expanded={journalOpen}
                            aria-controls="mood-journal-body"
                            aria-label={t("MoodJournalToggle")}
                            data-testid="mood-journal-toggle"
                            className="flex w-full items-center gap-2 text-left"
                        >
                            <BookHeart size={14.5} aria-hidden="true" className="text-text-3" />
                            <h2
                                id="mood-journal-heading"
                                className="text-[12.5px] font-semibold text-text-2"
                            >
                                {t("MoodJournalTitle")}
                            </h2>
                            <ChevronDown
                                size={15}
                                aria-hidden="true"
                                className={`ml-auto text-text-3 transition-transform duration-200 ${
                                    journalOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        <div id="mood-journal-body" hidden={!journalOpen}>
                            <textarea
                                value={draft}
                                onChange={(event) =>
                                    setDraft(event.target.value.slice(0, MAX_MOOD_NOTE_LENGTH))
                                }
                                placeholder={t("MoodJournalPlaceholder")}
                                aria-label={t("MoodJournalTitle")}
                                data-testid="mood-note"
                                rows={9}
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
                        </div>
                    </section>

                    <section aria-labelledby="mood-recent-heading">
                        <div className="mb-2.5 flex flex-wrap items-center gap-2">
                            <h2
                                id="mood-recent-heading"
                                className="text-[12.5px] font-semibold text-text-2"
                            >
                                {t("MoodRecentTitle")}
                            </h2>
                            {/* The list is paged, so say where it ends rather than leaving the
                                cut-off to be discovered. */}
                            {allEntries.length > 0 && (
                                <span className="font-mono text-[11px] text-text-3">
                                    {t("MoodRecentShowing", {
                                        shown: Math.min(shown, filtered.length),
                                        total: allEntries.length,
                                    })}
                                </span>
                            )}
                        </div>

                        {allEntries.length > 0 && (
                            <div
                                className="mb-2.5 flex flex-wrap gap-1.5"
                                role="group"
                                aria-label={t("MoodRecentFilterLabel")}
                                data-testid="mood-level-filter"
                            >
                                {MOOD_LEVELS.filter(
                                    (level) => (countByLevel.get(level) ?? 0) > 0,
                                ).map((level) => {
                                    const isOn = activeLevels.includes(level);
                                    return (
                                        <button
                                            key={level}
                                            type="button"
                                            aria-pressed={isOn}
                                            onClick={() => toggleLevel(level)}
                                            data-testid={`mood-filter-${level}`}
                                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                                                isOn
                                                    ? "border-accent bg-accent-soft text-accent"
                                                    : "border-border text-text-3 hover:text-text-2"
                                            }`}
                                        >
                                            {isOn && <Check size={12} aria-hidden="true" />}
                                            {t(moodLabelKey(level))}
                                            <span className="font-mono text-[11px] opacity-70">
                                                {countByLevel.get(level)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {allEntries.length === 0 && !loading ? (
                            <EmptyState
                                icon={<BookHeart size={20} aria-hidden="true" />}
                                title={t("MoodNoEntriesTitle")}
                                description={t("MoodNoEntriesDescription")}
                                testId="mood-empty-state"
                            />
                        ) : filtered.length === 0 ? (
                            <p className="py-6 text-center text-sm text-text-3">
                                {t("MoodRecentAllHidden")}
                            </p>
                        ) : (
                            <>
                                <ul className="flex flex-col gap-2" data-testid="mood-recent">
                                    {filtered.slice(0, shown).map((item) => {
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
                                                        {shortDate.format(
                                                            new Date(`${item.date}T12:00:00`),
                                                        )}
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

                                {filtered.length > shown && (
                                    <button
                                        type="button"
                                        onClick={() => setShown((count) => count + RECENT_PAGE)}
                                        data-testid="mood-show-more"
                                        className="mt-2.5 w-full rounded-control border border-border py-2 text-[12.5px] text-text-2 hover:bg-surface-2"
                                    >
                                        {t("MoodRecentShowMore")}
                                    </button>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </div>

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
        </div>
    );
}
