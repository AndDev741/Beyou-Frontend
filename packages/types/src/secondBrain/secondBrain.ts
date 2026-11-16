import type { BriefingGoal } from '../briefing/briefing';

/**
 * Second Brain: the page where a person sees what Beyou understands about their life, answers
 * what it still wants to know, and decides what it may read.
 *
 * Every percentage and verdict here is computed on the server, for the reason the daily
 * briefing gives: two clients would each round their own way and disagree about the same week.
 */

/** Mirrors the backend enum. A source that is off contributes nothing anywhere. */
export const SECOND_BRAIN_SOURCES = ['ROUTINES', 'GOALS', 'MOOD', 'CALENDAR', 'NOTEBOOK', 'IDEAS'] as const;

export type SecondBrainSource = (typeof SECOND_BRAIN_SOURCES)[number];

export type SecondBrainSourceState = {
    source: SecondBrainSource;
    enabled: boolean;
};

export const SECOND_BRAIN_FACT_KINDS = ['OBJECTIVE', 'LIKE', 'ABOUT'] as const;

export type SecondBrainFactKind = (typeof SECOND_BRAIN_FACT_KINDS)[number];

/** The server's cap. Facts ride along with every chat, so their size is a cost. */
export const SECOND_BRAIN_FACT_TEXT_MAX = 200;
export const SECOND_BRAIN_FACT_LIMIT = 20;
export const SECOND_BRAIN_ANSWER_MAX = 2000;
/** The most questions the server keeps open at once. */
export const SECOND_BRAIN_OPEN_QUESTIONS_MAX = 5;

/** One thing every chat should know: an objective, something the person likes, or a fact about them. */
export type SecondBrainFact = {
    id: string;
    kind: SecondBrainFactKind;
    text: string;
    /** USER typed it on the page; ANSWER came out of a reply to a question. */
    origin: 'USER' | 'ANSWER';
    createdAt: string;
    updatedAt: string;
};

export type SecondBrainFactInput = {
    kind: SecondBrainFactKind;
    text: string;
};

export type SecondBrainQuestionKind =
    | 'PROFILE_OBJECTIVES'
    | 'PROFILE_LIKES'
    | 'PROFILE_ABOUT'
    | 'CHECK_IN'
    | 'FOLLOW_UP';

export type SecondBrainQuestion = {
    id: string;
    kind: SecondBrainQuestionKind;
    /** Written by the server in the account's language, so it is shown as it comes. */
    text: string;
    status: 'OPEN' | 'ANSWERED' | 'SKIPPED';
    answer: string | null;
    createdAt: string;
    answeredAt: string | null;
};

export type SecondBrainAnswerResult = {
    question: SecondBrainQuestion;
    /** What the answer added to the profile. Empty when it held nothing lasting. */
    learned: SecondBrainFact[];
};

/**
 * What the overview says first. The page shows it as a label, because the point of the page
 * is to know this at a glance and prose has to be read to be known.
 */
export type SecondBrainVerdict = 'ON_COURSE' | 'DRIFTING' | 'TOO_EARLY';

export type SecondBrainInsight = {
    text: string | null;
    /** Null while nothing has been written yet. */
    verdict: SecondBrainVerdict | null;
    generatedAt: string | null;
    /**
     * True when there is nothing written yet, or what is there was written before the
     * account's current day. A stale overview is rewritten on the first visit of the day.
     */
    stale: boolean;
};

/** One routine item's week: the days it came up and the days it was checked. */
export type SecondBrainItemPattern = {
    name: string;
    asked: number;
    checked: number;
};

export type SecondBrainRoutine = {
    /** Null on an account's first week, when there is nothing to divide. */
    thisWeekPercent: number | null;
    previousWeekPercent: number | null;
    slipping: SecondBrainItemPattern[];
    steady: SecondBrainItemPattern[];
};

/** A category seen as a life area: how much of what it asked for got done lately. */
export type SecondBrainArea = {
    categoryId: string;
    name: string;
    iconId: string | null;
    asked: number;
    checked: number;
    percent: number | null;
};

export type SecondBrainOverview = {
    insight: SecondBrainInsight;
    goalsAhead: BriefingGoal[];
    /** Null when the routines source is off. */
    routine: SecondBrainRoutine | null;
    areas: SecondBrainArea[];
    /** Open questions only, oldest first. */
    questions: SecondBrainQuestion[];
    facts: SecondBrainFact[];
    sources: SecondBrainSourceState[];
    aiAvailable: boolean;
};
