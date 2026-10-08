import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { Smile } from "lucide-react";
import { saveMoodEntry, setMoodLevel } from "@beyou/api/mood/moodApi";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { MOOD_LEVELS, moodLabelKey, upsertMoodEntry } from "@beyou/state";
import { MAX_MOOD_NOTE_LENGTH, type MoodEntry, type MoodLevel } from "@beyou/types/mood/mood";
import { MOOD_FACES } from "../../mood/moodScale";

type Props = {
    /** The account's today, from the briefing, so the entry lands on the day the server means. */
    date: string;
    /** Today's entry if one exists, from the shared mood slice. */
    entry: MoodEntry | undefined;
    /** True until today's entry has been read. Nothing is written before then. */
    loading: boolean;
};

/**
 * "How are you today?", inside the morning dialog.
 *
 * The briefing is the one screen people open at the start of a day, which makes it the
 * natural moment to mark one. Same two writes as the dashboard widget and for the same
 * reason: a face is a PATCH that cannot touch the journal, and the note is a PUT that only
 * becomes available once today's entry has been read, prefilled with whatever is already
 * written. Without that order a quick note typed here would replace a longer one written on
 * the phone an hour earlier.
 *
 * The entry goes into the shared slice, so the widget behind the modal is already right when
 * the dialog closes.
 */
export default function MoodCheckIn({ date, entry, loading }: Props) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [saving, setSaving] = useState(false);
    const [writing, setWriting] = useState(false);
    const [draft, setDraft] = useState("");
    const [justSaved, setJustSaved] = useState(false);

    const pick = async (mood: MoodLevel) => {
        if (saving || loading) return;
        setSaving(true);
        const response = await setMoodLevel(date, mood, t);
        setSaving(false);
        if (response.success) {
            dispatch(upsertMoodEntry(response.success));
            return;
        }
        toast.error(getFriendlyErrorMessage(t, response.error));
    };

    const startWriting = () => {
        setDraft(entry?.note ?? "");
        setJustSaved(false);
        setWriting(true);
    };

    const saveNote = async () => {
        if (!entry || saving) return;
        setSaving(true);
        const trimmed = draft.trim();
        const note = trimmed === "" ? null : trimmed;
        const response = await saveMoodEntry(date, { mood: entry.mood, note }, t);
        setSaving(false);
        if (response.success) {
            dispatch(upsertMoodEntry(response.success));
            setWriting(false);
            setJustSaved(true);
            return;
        }
        toast.error(getFriendlyErrorMessage(t, response.error));
    };

    return (
        <section className="mt-5" data-testid="briefing-mood-today">
            <div className="flex items-center gap-2">
                <Smile size={14} className="shrink-0 text-text-3" aria-hidden="true" />
                <h4 className="text-xs font-semibold text-text-2">{t("HowAreYouToday")}</h4>
                <span className="h-px flex-1 bg-border" />
            </div>

            <div className="mt-2.5 flex items-center gap-1.5" role="group" aria-label={t("HowAreYouToday")}>
                {MOOD_LEVELS.map((level) => {
                    const { Icon, text } = MOOD_FACES[level];
                    const chosen = entry?.mood === level;
                    return (
                        <button
                            key={level}
                            type="button"
                            onClick={() => pick(level)}
                            disabled={saving || loading}
                            aria-label={t(moodLabelKey(level))}
                            aria-pressed={chosen}
                            data-testid={`briefing-mood-face-${level}`}
                            className={`flex size-9 items-center justify-center rounded-full border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
                                chosen ? "border-transparent bg-surface-2" : "border-border hover:bg-surface-2"
                            } ${text}`}
                        >
                            <Icon size={19} aria-hidden="true" />
                        </button>
                    );
                })}
            </div>

            {entry && !writing && (
                <div className="mt-2 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={startWriting}
                        className="rounded-control text-xs font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        data-testid="briefing-mood-note-toggle"
                    >
                        {entry.note ? t("BriefingMoodEditNote") : t("BriefingMoodAddNote")}
                    </button>
                    {justSaved && (
                        <span className="text-xs text-text-3" role="status">
                            {t("MoodJournalSaved")}
                        </span>
                    )}
                </div>
            )}

            {entry && writing && (
                <div className="mt-2.5">
                    <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        maxLength={MAX_MOOD_NOTE_LENGTH}
                        rows={3}
                        placeholder={t("MoodJournalPlaceholder")}
                        aria-label={t("MoodJournalTitle")}
                        className="w-full resize-y rounded-control border border-border bg-surface p-2.5 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
                        data-testid="briefing-mood-note"
                        autoFocus
                    />
                    <div className="mt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setWriting(false)}
                            className="rounded-control px-3 py-1.5 text-xs font-semibold text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                        >
                            {t("Cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={saveNote}
                            disabled={saving}
                            className="rounded-control bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition-colors duration-200 hover:bg-accent/15 disabled:opacity-60"
                            data-testid="briefing-mood-note-save"
                        >
                            {t("MoodJournalSave")}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
