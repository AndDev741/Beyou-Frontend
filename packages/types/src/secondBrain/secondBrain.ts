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
/** The server's cap on one note about a habit, goal, routine or category. */
export const SECOND_BRAIN_NOTE_TEXT_MAX = 500;
export const SECOND_BRAIN_FACT_LIMIT = 20;
export const SECOND_BRAIN_ANSWER_MAX = 2000;
/** The most questions the server keeps open at once. */
export const SECOND_BRAIN_OPEN_QUESTIONS_MAX = 5;

/**
 * Where a profile line came from. USER typed it on the page; ANSWER came out of a reply to a
 * question; ASSISTANT was written by the chat assistant; OLD_NOTE was kept from the hidden note
 * the assistant used to keep, when the person reviewed it on the page.
 */
export type SecondBrainFactOrigin = 'USER' | 'ANSWER' | 'ASSISTANT' | 'OLD_NOTE';

/** One thing every chat should know: an objective, something the person likes, or a fact about them. */
export type SecondBrainFact = {
    id: string;
    kind: SecondBrainFactKind;
    text: string;
    origin: SecondBrainFactOrigin;
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
    | 'FOLLOW_UP'
    /**
     * Asked once about a habit, goal or routine created after the account's first visit. The
     * text already carries the thing's name, in the language of the account at creation.
     */
    | 'NEW_THING';

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
    /**
     * The notes the answer left on habits, goals, routines or categories. Empty when none.
     * Where a note lands in the memory block is decided on the server, so a client that gets
     * any here reads the page again instead of placing them itself.
     */
    notes: SecondBrainNote[];
};

/**
 * Where a note about a thing came from: typed by the person, an answer on the page, or the
 * assistant. Editing a note keeps its origin, as editing a profile line does.
 */
export type SecondBrainNoteOrigin = 'USER' | 'ANSWER' | 'ASSISTANT';

/** One dated line about a habit, goal, routine or category. */
export type SecondBrainNote = {
    id: string;
    /** 1 to 500 characters. */
    text: string;
    origin: SecondBrainNoteOrigin;
    /** The thing's name when the note was written. Kept when the thing is deleted. */
    subjectName: string;
    createdAt: string;
    updatedAt: string;
};

/**
 * What a group of notes is about. LOOSE is a note whose thing is gone and that has no
 * category left to move to.
 */
export type SecondBrainSubjectType = 'HABIT' | 'GOAL' | 'ROUTINE' | 'CATEGORY' | 'LOOSE';

/** What a deleted thing used to be, carried on the notes it left behind. */
export type SecondBrainFormerType = 'HABIT' | 'GOAL' | 'ROUTINE';

/** One thing and its notes, oldest first, which is the timeline the page draws. */
export type SecondBrainMemorySubject = {
    type: SecondBrainSubjectType;
    /** The thing's id; the category's own id for a CATEGORY subject; null for LOOSE. */
    id: string | null;
    /** The live name while the thing exists, the name kept on its notes once it does not. */
    name: string;
    iconId: string | null;
    /**
     * Set when the thing was deleted. A deleted habit's or goal's notes move to its first
     * category and show there as a subject of their own, apart from the category's notes.
     */
    formerType: SecondBrainFormerType | null;
    notes: SecondBrainNote[];
};

/**
 * One category's notes. The group with a null category holds routines and loose notes, and
 * comes last. The server sends no empty groups.
 */
export type SecondBrainMemoryGroup = {
    categoryId: string | null;
    categoryName: string | null;
    categoryIconId: string | null;
    subjects: SecondBrainMemorySubject[];
};

/**
 * What came back from keeping or dropping one line of the old note: the lines still left, and
 * the profile line it became when it was kept (null when it was dropped).
 */
export type SecondBrainOldNoteResult = {
    lines: string[];
    fact: SecondBrainFact | null;
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

/**
 * One routine item's week, counted per time it came up: an item in two routines, or twice in
 * one, counts twice on the same day.
 */
export type SecondBrainItemPattern = {
    name: string;
    /** Times it came up, skipped ones included. */
    asked: number;
    checked: number;
    /**
     * Times it was skipped. On a slipping item it tells a habit dropped on purpose from one
     * forgotten; a steady item always has zero.
     */
    skipped: number;
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
    /** The notes about things, grouped by category. Empty when there are none. */
    memory: SecondBrainMemoryGroup[];
    /**
     * The note the assistant used to keep out of sight, split into sentences for the person to
     * keep in the profile or drop. Empty once it is dealt with. Until then it still goes with
     * every conversation. Each line is sent back exactly as it came, since the server finds it
     * by its text.
     */
    oldNote: string[];
};
