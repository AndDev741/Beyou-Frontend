import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { Smile } from "lucide-react";
import { setMoodLevel } from "@beyou/api/mood/moodApi";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { MOOD_LEVELS, addDays, moodLabelKey, upsertMoodEntry, weekEnding } from "@beyou/state";
import type { MoodLevel } from "@beyou/types/mood/mood";
import { toast } from "react-toastify";
import BaseDiv from "./baseDiv";
import { MOOD_FACES } from "../mood/moodScale";
import useMoodRange from "../../hooks/useMoodRange";
import useTodayInZone from "../../hooks/useTodayInZone";

/**
 * The week's moods, and a one-tap way to mark today.
 *
 * Two states in one widget. Today unmarked: the five faces, and tapping one records it. Today
 * marked: seven dots for the week, with today ringed; tapping today's dot brings the faces back
 * so a mood can be corrected.
 *
 * It writes through PATCH, never PUT, so it cannot clear a journal entry it never loaded. That
 * is enforced on the server too — see `MoodController` — but the choice of call is here.
 */
export default function MoodWeek() {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const today = useTodayInZone();
    const week = useMemo(() => weekEnding(today), [today]);
    const { byDate, loading } = useMoodRange(addDays(today, -6), today);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);

    const todayEntry = byDate[today];
    // Nothing is decided until the week has arrived. Choosing between the faces and the strip
    // while `loading` painted a full week of blank dots on every dashboard load, then flipped —
    // and for anyone who had not marked today, flipped again to the faces. The strip's shape is
    // kept as the placeholder so the rail does not jump; `data-loading` is what tells a reader
    // (and a test) a dot is a placeholder rather than a day nobody recorded.
    const showFaces = editing || (!loading && !todayEntry);

    const pick = async (mood: MoodLevel) => {
        if (saving) return;
        setSaving(true);
        const response = await setMoodLevel(today, mood, t);
        setSaving(false);
        if (response.success) {
            dispatch(upsertMoodEntry(response.success));
            setEditing(false);
            return;
        }
        toast.error(getFriendlyErrorMessage(t, response.error));
    };

    const weekdayOf = new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" });
    const dayLabel = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });

    return (
        <BaseDiv
            title={showFaces ? t("HowAreYouToday") : t("MoodYourWeek")}
            icon={<Smile size={14.5} aria-hidden="true" />}
            action={
                <Link to="/mood" className="text-[11.5px] font-medium hover:text-text-2">
                    {t("MoodWriteAction")}
                </Link>
            }
        >
            {showFaces ? (
                <div className="mt-3" data-testid="mood-week-faces">
                    <div className="flex items-center justify-between gap-1.5">
                        {MOOD_LEVELS.map((level) => {
                            const { Icon, text } = MOOD_FACES[level];
                            const chosen = todayEntry?.mood === level;
                            return (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => pick(level)}
                                    disabled={saving}
                                    aria-label={t(moodLabelKey(level))}
                                    aria-pressed={chosen}
                                    data-testid={`mood-face-${level}`}
                                    className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
                                        chosen
                                            ? "border-transparent bg-surface-2"
                                            : "border-border hover:bg-surface-2"
                                    } ${text}`}
                                >
                                    <Icon size={22} aria-hidden="true" />
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-2.5 text-[11.5px] text-text-3">{t("MoodWidgetEmptyHint")}</p>
                </div>
            ) : (
                <div className="mt-3" data-testid="mood-week-strip" data-loading={loading ? "true" : "false"}>
                    <div className="flex items-end justify-between gap-1.5">
                        {week.map((day) => {
                            if (loading) {
                                return (
                                    <div key={day} className="flex flex-col items-center gap-1.5">
                                        <span className="block h-7 w-7 animate-pulse rounded-full bg-surface-2" />
                                        <span className="text-[10.5px] text-text-3" aria-hidden="true">
                                            {weekdayOf.format(new Date(`${day}T12:00:00`))}
                                        </span>
                                    </div>
                                );
                            }
                            const entry = byDate[day];
                            const face = entry ? MOOD_FACES[entry.mood] : null;
                            const isToday = day === today;
                            const label = entry
                                ? `${dayLabel.format(new Date(`${day}T12:00:00`))}: ${t(moodLabelKey(entry.mood))}`
                                : `${dayLabel.format(new Date(`${day}T12:00:00`))}: ${t("MoodNotRecorded")}`;
                            const dot = (
                                <span
                                    className={`block h-7 w-7 rounded-full ${
                                        face ? face.fill : "bg-surface-2"
                                    } ${isToday ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                                />
                            );
                            return (
                                <div key={day} className="flex flex-col items-center gap-1.5">
                                    {isToday ? (
                                        <button
                                            type="button"
                                            onClick={() => setEditing(true)}
                                            aria-label={label}
                                            data-testid="mood-week-today"
                                            className="rounded-full"
                                        >
                                            {dot}
                                        </button>
                                    ) : (
                                        <span title={label} aria-label={label} role="img">
                                            {dot}
                                        </span>
                                    )}
                                    <span className="text-[10.5px] text-text-3" aria-hidden="true">
                                        {weekdayOf.format(new Date(`${day}T12:00:00`))}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </BaseDiv>
    );
}
