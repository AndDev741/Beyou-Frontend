/**
 * The study notebook, as the server sends it.
 *
 * Wire names match the backend DTOs under `domain/notebook`. Everything is a page: a topic is a
 * root page (`kind: "TOPIC"`), and every node on a roadmap board opens a page of its own.
 */

import type { RefreshUI } from '../refreshUi/refreshUi.type';

export type NotebookPageKind = 'TOPIC' | 'PAGE';
export type NotebookStatus = 'TO_STUDY' | 'STUDYING' | 'DONE';
/** What a client may ask a status to be: the three, plus AUTO ("follow my board's nodes"). */
export type StatusChoice = NotebookStatus | 'AUTO';

/** Leaves done out of leaves in total, counted through every board below a page. */
export type Progress = { done: number; total: number };

export type PageRef = { id: string; title: string; icon: string | null };
export type LinkRef = { id: string; name: string };

export type NotebookPage = {
    id: string;
    kind: NotebookPageKind;
    topicId: string | null;
    parentId: string | null;
    title: string;
    icon: string | null;
    description: string | null;
    /** BlockNote document JSON, or null for a page nobody has written in. */
    content: string | null;
    status: NotebookStatus;
    statusManual: boolean;
    hasBoard: boolean;
    progress: Progress;
    /** Topic first, this page last. */
    breadcrumb: PageRef[];
    goal: LinkRef | null;
    category: LinkRef | null;
    habit: LinkRef | null;
    focusMinutes: number;
    cardsTotal: number;
    cardsDue: number;
    sourcesCount: number;
    updatedAt: string;
    /** Goes up on every write of `content`. The editor saves from it and is refused when it is stale. */
    contentRevision: number;
};

export type TreeItem = {
    id: string;
    parentId: string;
    title: string;
    icon: string | null;
    status: NotebookStatus;
    /** On its parent's board. The sidebar lists the rest under "Pages off the board". */
    onBoard: boolean;
    /** A node pointing at a page whose home is another topic. */
    linked: boolean;
    progress: Progress;
    position: number;
};

export type NotebookTree = { topic: PageRef; items: TreeItem[]; sourcesCount: number; cardsDue: number };

export type MiniNode = { id: string; x: number; y: number; status: NotebookStatus };
export type MiniEdge = { source: string; target: string };

export type TopicSummary = {
    id: string;
    title: string;
    icon: string | null;
    description: string | null;
    progress: Progress;
    cardsDue: number;
    sourcesCount: number;
    next: PageRef | null;
    goal: LinkRef | null;
    habit: LinkRef | null;
    preview: MiniNode[];
    previewEdges: MiniEdge[];
    updatedAt: string;
};

export type ContinueStudying = {
    pageId: string;
    title: string;
    icon: string | null;
    topicId: string | null;
    topicTitle: string | null;
    studyingTitle: string | null;
    progress: Progress;
    lastOpenedAt: string;
};

export type TopicDue = { topicId: string; title: string; due: number };
export type ReviewSummary = { due: number; byTopic: TopicDue[]; streak: number };

export type NotebookHome = {
    topics: TopicSummary[];
    continueStudying: ContinueStudying | null;
    review: ReviewSummary;
};

export type PageStatus = { pageId: string; status: NotebookStatus };

export type StatusChange = {
    pageId: string;
    status: NotebookStatus;
    statusManual: boolean;
    changed: PageStatus[];
    xpEarned: number;
    refreshUi: RefreshUI | null;
};

export type PageSearchHit = {
    id: string;
    title: string;
    icon: string | null;
    kind: NotebookPageKind;
    topicId: string;
    topicTitle: string | null;
};

// ------------------------------------------------------------------ board

export type NodeKind = 'PAGE' | 'SECTION';

export type BoardNode = {
    id: string;
    kind: NodeKind;
    pageId: string | null;
    title: string;
    icon: string | null;
    status: NotebookStatus;
    progress: Progress | null;
    hasBoard: boolean;
    x: number;
    y: number;
    width: number | null;
    height: number | null;
    linked: boolean;
    homeTopicTitle: string | null;
};

export type BoardEdge = { id: string; source: string; target: string };
export type Board = { pageId: string; nodes: BoardNode[]; edges: BoardEdge[] };

export type BoardChange = { node: BoardNode | null; changed: PageStatus[]; refreshUi: RefreshUI | null };

export type CreateNodeInput = {
    kind?: NodeKind;
    title?: string;
    linkPageId?: string;
    label?: string;
    /** Both or neither: without them the server puts the node on the next free grid cell. */
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    /** A page node on the same board to link to the new one, so it comes after it on the path. */
    after?: string;
};

// ------------------------------------------------------------------ cards

export type CardRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export type Flashcard = {
    id: string;
    pageId: string;
    front: string;
    back: string;
    sourceLabel: string | null;
    dueOn: string;
    intervalDays: number;
    reps: number;
    createdAt: string;
};

export type DueCard = {
    id: string;
    pageId: string;
    pageTitle: string | null;
    topicId: string | null;
    topicTitle: string | null;
    front: string;
    back: string;
    sourceLabel: string | null;
    /** Days each button would schedule. AGAIN is 0: back in this session. */
    intervals: Record<CardRating, number>;
};

export type DueCards = { cards: DueCard[]; total: number; streak: number };

export type ReviewResult = { cardId: string; dueOn: string; intervalDays: number; dueAgainToday: boolean };

export type FinishReview = { paidReviews: number; xpEarned: number; streak: number; refreshUi: RefreshUI | null };

/** Longest card side the API accepts. */
export const MAX_CARD_SIDE_LENGTH = 2000;

// ---------------------------------------------------------------- sources

export type SourceKind = 'PDF' | 'LINK' | 'TEXT';
export type SourceStatus = 'PENDING' | 'READING' | 'READY' | 'FAILED';

export type NotebookSource = {
    id: string;
    pageId: string;
    pageTitle: string | null;
    /** Added to a page above this one and read from here too. */
    inherited: boolean;
    kind: SourceKind;
    title: string;
    url: string | null;
    status: SourceStatus;
    progress: number;
    /** ErrorKey name when FAILED. */
    errorKey: string | null;
    enabled: boolean;
    pageCount: number | null;
    charCount: number | null;
    createdAt: string;
};

export type Passage = {
    sourceId: string;
    sourceTitle: string;
    kind: SourceKind;
    url: string | null;
    chunkId: string;
    pageNumber: number | null;
    text: string;
    before: string | null;
    after: string | null;
};

/** Largest PDF the server reads, mirroring `LinkFetcher.MAX_PDF_BYTES`. */
export const MAX_SOURCE_PDF_BYTES = 15 * 1024 * 1024;

// ------------------------------------------------------------------ study

export type Citation = {
    n: number;
    kind: 'SOURCE' | 'PAGE';
    sourceId: string | null;
    chunkId: string | null;
    pageId: string | null;
    title: string;
    pageNumber: number | null;
    excerpt: string;
};

export type Answer = { markdown: string; citations: Citation[] };

export type ChatMessage = {
    id: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    citations: Citation[];
    createdAt: string;
};

export type ChatTurn = { question: ChatMessage; answer: ChatMessage };

export type StudyOutputKind = 'OVERVIEW' | 'SUMMARY' | 'STUDY_GUIDE' | 'QUIZ';

export type QuizQuestion = { index: number; question: string; options: string[] };

export type StudyOutput = {
    id: string;
    pageId: string;
    kind: StudyOutputKind;
    /** The page's title; the client prefixes it with the kind. */
    title: string;
    markdown: string | null;
    citations: Citation[];
    questions: QuizQuestion[] | null;
    score: number | null;
    total: number | null;
    passedAt: string | null;
    createdAt: string;
};

export type Overview = {
    id: string;
    summary: string;
    questions: string[];
    citations: Citation[];
    createdAt: string;
};

export type QuizAnswer = {
    index: number;
    chosen: number;
    correct: number;
    right: boolean;
    explanation: string;
    citation: Citation | null;
};

export type QuizResult = {
    score: number;
    total: number;
    passed: boolean;
    answers: QuizAnswer[];
    xpEarned: number;
    refreshUi: RefreshUI | null;
};

export type StudyRoom = {
    page: PageRef;
    breadcrumb: PageRef[];
    overview: Overview | null;
    messages: ChatMessage[];
    outputs: StudyOutput[];
    sources: NotebookSource[];
    cardsTotal: number;
    cardsDue: number;
    /** The room's goal and notes scope. `configuredAt` null opens the setup screen. */
    setup: StudySetup;
    /** What each notes scope would read, for the setup screen. */
    scopes: StudyScopeOption[];
    /** Whether "find sources for me" has a web search configured. */
    discovery: boolean;
};

/** Whose notes the study AI reads. Every scope keeps the pages above the page for context. */
export type StudyScope = 'PAGE' | 'SUBTREE' | 'TOPIC';

export type StudySetup = { goal: string | null; scope: StudyScope; configuredAt: string | null };

/** `pages` that have notes in the scope, and the `words` across them. */
export type StudyScopeOption = { scope: StudyScope; pages: number; words: number };

/** A page the web search found and the server opened; `url` is where it really lands. */
export type DiscoveredSource = { title: string; url: string; domain: string; summary: string };

/** `skipped`: results dropped because they did not open, were private, or are already sources. */
export type DiscoveryResult = { provider: string; sources: DiscoveredSource[]; skipped: number };

// --------------------------------------------------------------------- AI

export type StudyLevel = 'NEW' | 'SOME' | 'SOLID';

export type DraftNodeInput = {
    title: string;
    why?: string | null;
    subtopics?: string[];
    estimatedHours?: number | null;
    linkPageId?: string | null;
};

export type DraftNode = {
    title: string;
    why: string;
    subtopics: string[];
    estimatedHours: number;
    optional: boolean;
    existingPageId: string | null;
    existingTopicTitle: string | null;
    existingProgress: Progress | null;
};

export type RoadmapDraft = { nodes: DraftNode[]; totalHours: number };

export type RoadmapDraftRequest = {
    title: string;
    why?: string;
    level?: StudyLevel;
    hoursPerWeek?: number;
    goalId?: string | null;
    references?: string[];
    changeRequest?: string;
    previous?: DraftNodeInput[];
};

export type CreateFromDraftRequest = {
    title: string;
    description?: string | null;
    icon?: string | null;
    goalId?: string | null;
    categoryId?: string | null;
    habitId?: string | null;
    nodes: DraftNodeInput[];
    /** The stored draft this came from; the server deletes it once the topic exists. */
    draftId?: string | null;
};

/** DRAFTING while the model writes it in the background; the client polls until it is not. */
export type RoadmapDraftStatus = 'DRAFTING' | 'READY' | 'FAILED';

/** What the person decided about one drafted node, in the order of the draft's nodes. */
export type DraftChoice = { keep: boolean; link: boolean };

/** A stored draft, enough to put the dialog back exactly where the person left it. */
export type RoadmapDraftRecord = {
    id: string;
    title: string;
    status: RoadmapDraftStatus;
    request: RoadmapDraftRequest;
    /** Null until the first call ends. During a redraft it is still the previous result. */
    result: RoadmapDraft | null;
    /** One per node of `result`, or null when the person has not changed any. */
    choices: DraftChoice[] | null;
    errorKey: string | null;
    /** When the current or last model call began. */
    startedAt: string;
    createdAt: string;
    updatedAt: string;
};

/** A draft as the notebook home lists it. */
export type RoadmapDraftSummary = {
    id: string;
    title: string;
    status: RoadmapDraftStatus;
    nodeCount: number;
    errorKey: string | null;
    startedAt: string;
    updatedAt: string;
};

export type SuggestedNode = { title: string; why: string };

/** The editor block type the board renders in. Must match `MarkdownBlocks.BOARD_BLOCK_TYPE`. */
export const BOARD_BLOCK_TYPE = 'roadmapBoard';
