import type {
    SecondBrainArea,
    SecondBrainFactKind,
    SecondBrainQuestionKind,
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
 * part of Beyou that can do it.
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
