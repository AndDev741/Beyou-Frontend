import { TFunction } from 'i18next';
import type {
    Answer, ChatTurn, CreateFromDraftRequest, DraftChoice, Flashcard, NotebookPage, QuizResult,
    RoadmapDraftRecord, RoadmapDraftRequest, RoadmapDraftSummary, StudyOutput, StudyOutputKind, StudyRoom,
    SuggestedNode,
} from '@beyou/types/notebook/notebook';
import { call, http, Result } from './result';

/**
 * The study room and every AI call. The AI routes answer `AI_UNAVAILABLE` when the model chain
 * is exhausted and `NOTEBOOK_NOTHING_TO_STUDY` when a page has no notes and no sources.
 */

export const getStudyRoom = (pageId: string, t: TFunction): Promise<Result<StudyRoom>> =>
    call(() => http().get<StudyRoom>(`/notebook/pages/${pageId}/study`), t);

export const clearStudyChat = (pageId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().delete<void>(`/notebook/pages/${pageId}/study/messages`), t);

/**
 * A model call can take a while; the default request timeout is for list reads.
 *
 * 100 seconds because that is when Cloudflare drops a request to the API anyway. The server
 * gives every notebook AI call, retry included, 90 seconds (NotebookLlm.BUDGET) and answers
 * AI_UNAVAILABLE when they run out, so it always answers before this fires. Lower this below
 * the server's budget and the person sees an error for work the server goes on to finish.
 */
const AI_TIMEOUT = 100_000;

export const askStudyQuestion = (pageId: string, message: string, t: TFunction): Promise<Result<ChatTurn>> =>
    call(() => http().post<ChatTurn>(`/notebook/ai/pages/${pageId}/chat`, { message }, { timeout: AI_TIMEOUT }), t);

export const generateStudyOutput = (pageId: string, kind: StudyOutputKind, t: TFunction): Promise<Result<StudyOutput>> =>
    call(() => http().post<StudyOutput>(`/notebook/ai/pages/${pageId}/outputs`, { kind }, { timeout: AI_TIMEOUT }), t);

export const getStudyOutput = (outputId: string, t: TFunction): Promise<Result<StudyOutput>> =>
    call(() => http().get<StudyOutput>(`/notebook/outputs/${outputId}`), t);

export const gradeQuiz = (outputId: string, answers: number[], t: TFunction): Promise<Result<QuizResult>> =>
    call(() => http().post<QuizResult>(`/notebook/outputs/${outputId}/quiz-result`, { answers }), t);

export const deleteStudyOutput = (outputId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().delete<void>(`/notebook/outputs/${outputId}`), t);

/**
 * "New topic with AI". Starting a draft stores it and answers at once, DRAFTING; the model writes
 * it in the background, and the client reads it back with getRoadmapDraft until it is READY or
 * FAILED. The draft stays until the topic is created from it or the person deletes it.
 */
export const startRoadmapDraft = (request: RoadmapDraftRequest, t: TFunction): Promise<Result<RoadmapDraftRecord>> =>
    call(() => http().post<RoadmapDraftRecord>('/notebook/ai/drafts', request), t);

/** Drafts again: from scratch, or applying `changeRequest` to `previous`. */
export const redraftRoadmap = (draftId: string, request: RoadmapDraftRequest, t: TFunction): Promise<Result<RoadmapDraftRecord>> =>
    call(() => http().post<RoadmapDraftRecord>(`/notebook/ai/drafts/${draftId}/redraft`, request), t);

export const getRoadmapDraft = (draftId: string, t: TFunction): Promise<Result<RoadmapDraftRecord>> =>
    call(() => http().get<RoadmapDraftRecord>(`/notebook/drafts/${draftId}`), t);

export const listRoadmapDrafts = (t: TFunction): Promise<Result<RoadmapDraftSummary[]>> =>
    call(() => http().get<RoadmapDraftSummary[]>('/notebook/drafts'), t);

/** The review dialog's ticks, one per drafted node. */
export const saveDraftChoices = (draftId: string, choices: DraftChoice[], t: TFunction): Promise<Result<RoadmapDraftRecord>> =>
    call(() => http().put<RoadmapDraftRecord>(`/notebook/drafts/${draftId}/choices`, { choices }), t);

export const deleteRoadmapDraft = (draftId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().delete<void>(`/notebook/drafts/${draftId}`), t);

/** Creates the reviewed draft in one transaction. */
export const createTopicFromDraft = (request: CreateFromDraftRequest, t: TFunction): Promise<Result<NotebookPage>> =>
    call(() => http().post<NotebookPage>('/notebook/topics/from-draft', request), t);

export const suggestNodes = (pageId: string, fromSources: boolean, t: TFunction): Promise<Result<SuggestedNode[]>> =>
    call(() => http().post<SuggestedNode[]>(`/notebook/ai/pages/${pageId}/suggest-nodes`, { fromSources },
        { timeout: AI_TIMEOUT }), t);

export const explainText = (pageId: string, text: string, t: TFunction): Promise<Result<Answer>> =>
    call(() => http().post<Answer>(`/notebook/ai/pages/${pageId}/explain`, { text }, { timeout: AI_TIMEOUT }), t);

/** Flashcards drafted by the AI and saved to the page; `text` narrows them to a passage. */
export const generateCards = (
    pageId: string,
    options: { text?: string; count?: number },
    t: TFunction,
): Promise<Result<Flashcard[]>> =>
    call(() => http().post<Flashcard[]>(`/notebook/ai/pages/${pageId}/cards`, options, { timeout: AI_TIMEOUT }), t);
