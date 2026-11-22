import type {
    SecondBrainAnswerResult,
    SecondBrainArea,
    SecondBrainFactKind,
    SecondBrainFactOrigin,
    SecondBrainFormerType,
    SecondBrainMemoryGroup,
    SecondBrainMemorySubject,
    SecondBrainNote,
    SecondBrainNoteOrigin,
    SecondBrainQuestionKind,
    SecondBrainSubjectType,
    SecondBrainSource,
    SecondBrainSourceState,
    SecondBrainVerdict,
} from '@beyou/types/secondBrain/secondBrain';
import { SECOND_BRAIN_OPEN_QUESTIONS_MAX } from '@beyou/types/secondBrain/secondBrain';

/**
 * The judgements the Second Brain page makes, shared by the web app and the phone app.
 *
 * Shared for the reason the briefing rules are: each of these is a small decision two apps
 * would make slightly differently within a month, and a page that calls a category "weakest"
 * on the phone and not on the web is the kind of bug nobody reports and everybody notices.
 * Everything here is pure. Storage, toasts and navigation stay in each app.
 */

/** How a verdict is drawn. Each app maps the tone to its own chip. */
export type SecondBrainVerdictTone = 'ok' | 'flame' | 'neutral';

/** Translation key and tone per verdict. Written out so a key sweep can see every one. */
export const SECOND_BRAIN_VERDICT: Record<SecondBrainVerdict, { label: string; tone: SecondBrainVerdictTone }> = {
    ON_COURSE: { label: 'SecondBrainVerdictOnCourse', tone: 'ok' },
    DRIFTING: { label: 'SecondBrainVerdictDrifting', tone: 'flame' },
    TOO_EARLY: { label: 'SecondBrainVerdictTooEarly', tone: 'neutral' },
};

/** The small label above a question, by kind. The three profile kinds share one. */
export const SECOND_BRAIN_QUESTION_LABEL: Record<SecondBrainQuestionKind, string> = {
    PROFILE_OBJECTIVES: 'SecondBrainQuestionKindProfile',
    PROFILE_LIKES: 'SecondBrainQuestionKindProfile',
    PROFILE_ABOUT: 'SecondBrainQuestionKindProfile',
    CHECK_IN: 'SecondBrainQuestionKindToday',
    FOLLOW_UP: 'SecondBrainQuestionKindFollowUp',
    NEW_THING: 'SecondBrainQuestionKindNewThing',
};

/** The heading over each group of profile lines. */
export const SECOND_BRAIN_FACT_TITLE: Record<SecondBrainFactKind, string> = {
    OBJECTIVE: 'SecondBrainFactObjective',
    LIKE: 'SecondBrainFactLike',
    ABOUT: 'SecondBrainFactAbout',
};

/**
 * Name and description per source. Each description says exactly what is read, because
 * "calendar" alone would leave a person guessing whether that means titles or everything.
 */
export const SECOND_BRAIN_SOURCE_TEXT: Record<SecondBrainSource, { name: string; detail: string }> = {
    ROUTINES: { name: 'SecondBrainSourceRoutines', detail: 'SecondBrainSourceRoutinesDetail' },
    GOALS: { name: 'SecondBrainSourceGoals', detail: 'SecondBrainSourceGoalsDetail' },
    MOOD: { name: 'SecondBrainSourceMood', detail: 'SecondBrainSourceMoodDetail' },
    CALENDAR: { name: 'SecondBrainSourceCalendar', detail: 'SecondBrainSourceCalendarDetail' },
    NOTEBOOK: { name: 'SecondBrainSourceNotebook', detail: 'SecondBrainSourceNotebookDetail' },
    IDEAS: { name: 'SecondBrainSourceIdeas', detail: 'SecondBrainSourceIdeasDetail' },
};

/**
 * Whether an answer can be handed to the assistant. A profile answer is the fact itself. A
 * check-in or a follow-up may call for something done in the app, and the assistant is the
 * part of Beyou that can do it. A question about something just created is answered with why
 * it started, which is a note and not a request, so it is not offered either.
 */
export function canActOnAnswer(kind: SecondBrainQuestionKind): boolean {
    return kind === 'CHECK_IN' || kind === 'FOLLOW_UP';
}

/** Whether a source is on. A source the list does not carry counts as off. */
export function secondBrainSourceEnabled(sources: SecondBrainSourceState[], source: SecondBrainSource): boolean {
    return sources.some((item) => item.source === source && item.enabled);
}

/**
 * Which categories get the "strongest" and "weakest" labels, or null when there are no two
 * ends to name: fewer than two categories with a percentage, or all of them level.
 *
 * Only the ends are named. Labelling every row would turn a ranking into a report card. The
 * server sends the areas sorted, so the ends are the first and the last with a percentage.
 */
export function secondBrainAreaEnds(areas: SecondBrainArea[]): { strongestId: string; weakestId: string } | null {
    const measured = areas.filter((area) => area.percent != null);
    if (measured.length < 2) return null;
    const strongest = measured[0];
    const weakest = measured[measured.length - 1];
    if (strongest.percent === weakest.percent) return null;
    return { strongestId: strongest.categoryId, weakestId: weakest.categoryId };
}

/** How long an app waits before asking the server for more questions again. */
export const SECOND_BRAIN_REFILL_EVERY_MS = 60 * 60 * 1000;

/**
 * Whether the page should ask the server to top the question list up.
 *
 * The request may end in a model call, so it sits in a costly rate tier and walking in and
 * out of the page must not turn into one each time. An empty list always asks: a person
 * looking at "no questions" should not be told to wait. A full list never does.
 *
 * @param lastRefillAt when this app last asked, in epoch milliseconds, or null if never or unknown
 */
export function secondBrainRefillIsDue(openCount: number, lastRefillAt: number | null, now: number): boolean {
    if (openCount === 0) return true;
    if (openCount >= SECOND_BRAIN_OPEN_QUESTIONS_MAX) return false;
    return lastRefillAt == null || now - lastRefillAt > SECOND_BRAIN_REFILL_EVERY_MS;
}

/**
 * The small line under a profile line saying where it came from, or null for one the person
 * typed, which needs no explanation. A null for an origin this app does not know yet, too: a
 * newer server adding one should not put a raw key on the page.
 */
const FACT_ORIGIN_LABEL: Record<SecondBrainFactOrigin, string | null> = {
    USER: null,
    ANSWER: 'SecondBrainFactFromAnswer',
    ASSISTANT: 'SecondBrainFromAssistant',
    OLD_NOTE: 'SecondBrainFactFromOldNote',
};

export function secondBrainFactOriginLabel(origin: SecondBrainFactOrigin): string | null {
    return FACT_ORIGIN_LABEL[origin] ?? null;
}

/**
 * Where a note about a thing came from. Every note says so, the ones the person typed too:
 * in a timeline that mixes the three, a blank would read as "unknown".
 */
const NOTE_ORIGIN_LABEL: Record<SecondBrainNoteOrigin, string> = {
    USER: 'SecondBrainNoteFromYou',
    ANSWER: 'SecondBrainFactFromAnswer',
    ASSISTANT: 'SecondBrainFromAssistant',
};

export function secondBrainNoteOriginLabel(origin: SecondBrainNoteOrigin): string | null {
    return NOTE_ORIGIN_LABEL[origin] ?? null;
}

/** What kind of thing a live subject is, shown beside its name. */
const SUBJECT_TYPE_LABEL: Record<Exclude<SecondBrainSubjectType, 'LOOSE'>, string> = {
    HABIT: 'SecondBrainSubjectHabit',
    GOAL: 'SecondBrainSubjectGoal',
    ROUTINE: 'SecondBrainSubjectRoutine',
    CATEGORY: 'SecondBrainSubjectCategory',
};

/** What a deleted thing was, said on the tag its notes carry. */
const DELETED_LABEL: Record<SecondBrainFormerType, string> = {
    HABIT: 'SecondBrainSubjectDeletedHabit',
    GOAL: 'SecondBrainSubjectDeletedGoal',
    ROUTINE: 'SecondBrainSubjectDeletedRoutine',
};

/**
 * The label beside a subject's name: what kind of thing it is, or, for a thing that was
 * deleted, a tag saying so ("deleted habit"). Null when there is nothing to say.
 *
 * A deleted habit's notes move to its category and show there as their own subject, so the
 * type alone ("category") would claim the notes are about the category. The tag wins.
 * A LOOSE subject's thing is gone with no category to move to. When it does not say what it
 * was (a deleted category's notes), the tag only says it was deleted.
 */
export function secondBrainSubjectLabel(
    subject: Pick<SecondBrainMemorySubject, 'type' | 'formerType'>,
): { key: string; deleted: boolean } | null {
    if (subject.formerType) {
        const key = DELETED_LABEL[subject.formerType];
        return key ? { key, deleted: true } : { key: 'SecondBrainSubjectDeleted', deleted: true };
    }
    if (subject.type === 'LOOSE') return { key: 'SecondBrainSubjectDeleted', deleted: true };
    const key = SUBJECT_TYPE_LABEL[subject.type];
    return key ? { key, deleted: false } : null;
}

/** The heading over a group of notes: the category's name, or the label for the rest. */
export const SECOND_BRAIN_MEMORY_OTHER_GROUP = 'SecondBrainMemoryOtherGroup';

export function secondBrainGroupHeading(
    group: Pick<SecondBrainMemoryGroup, 'categoryId' | 'categoryName'>,
): { name: string } | { key: string } {
    return group.categoryId != null && group.categoryName
        ? { name: group.categoryName }
        : { key: SECOND_BRAIN_MEMORY_OTHER_GROUP };
}

/**
 * A stable key for a subject. Its id is not enough: a LOOSE subject has none, and a category's
 * own notes and the notes a deleted habit left on it share the category's id.
 */
export function secondBrainSubjectKey(subject: SecondBrainMemorySubject): string {
    return [subject.type, subject.id ?? '', subject.formerType ?? '', subject.name].join(':');
}

/** How many notes the memory block holds. */
export function secondBrainNoteCount(memory: SecondBrainMemoryGroup[]): number {
    return memory.reduce(
        (total, group) => total + group.subjects.reduce((sum, subject) => sum + subject.notes.length, 0),
        0,
    );
}

/** The memory with one note replaced by what the server answered for it, in the same place. */
export function secondBrainMemoryWithNote(
    memory: SecondBrainMemoryGroup[],
    note: SecondBrainNote,
): SecondBrainMemoryGroup[] {
    return memory.map((group) => ({
        ...group,
        subjects: group.subjects.map((subject) =>
            subject.notes.some((item) => item.id === note.id)
                ? { ...subject, notes: subject.notes.map((item) => (item.id === note.id ? note : item)) }
                : subject,
        ),
    }));
}

/**
 * The memory without one note. A subject left with no notes goes, and so does a group left
 * with no subjects: the server sends neither, so the page would otherwise show something a
 * reload would not.
 */
export function secondBrainMemoryWithoutNote(
    memory: SecondBrainMemoryGroup[],
    noteId: string,
): SecondBrainMemoryGroup[] {
    return memory
        .map((group) => ({
            ...group,
            subjects: group.subjects
                .map((subject) => ({ ...subject, notes: subject.notes.filter((note) => note.id !== noteId) }))
                .filter((subject) => subject.notes.length > 0),
        }))
        .filter((group) => group.subjects.length > 0);
}

/**
 * Whether an answer left notes on things, which means the page reads itself again: where a
 * note lands in the memory block (which category, which subject) is the server's call. An
 * answer from a server older than the notes has no `notes` at all, and that counts as none.
 */
export function secondBrainAnswerLeftNotes(result: Pick<SecondBrainAnswerResult, 'notes'>): boolean {
    return Array.isArray(result.notes) && result.notes.length > 0;
}

/** A note's date as the page shows it, in the reader's language. Empty for a date it cannot read. */
export function secondBrainNoteDate(iso: string, locale: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    try {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    } catch {
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
    }
}
