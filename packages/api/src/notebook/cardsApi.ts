import { TFunction } from 'i18next';
import type { CardRating, DueCards, FinishReview, Flashcard, ReviewResult } from '@beyou/types/notebook/notebook';
import { call, http, Result } from './result';

/** Flashcards and reviewing them. */

export const getPageCards = (pageId: string, t: TFunction): Promise<Result<Flashcard[]>> =>
    call(() => http().get<Flashcard[]>(`/notebook/pages/${pageId}/cards`), t);

export const createCard = (
    pageId: string,
    card: { front: string; back: string; sourceLabel?: string | null },
    t: TFunction,
): Promise<Result<Flashcard>> => call(() => http().post<Flashcard>(`/notebook/pages/${pageId}/cards`, card), t);

export const updateCard = (
    cardId: string,
    patch: { front?: string; back?: string },
    t: TFunction,
): Promise<Result<Flashcard>> => call(() => http().patch<Flashcard>(`/notebook/cards/${cardId}`, patch), t);

export const deleteCard = (cardId: string, t: TFunction): Promise<Result<void>> =>
    call(() => http().delete<void>(`/notebook/cards/${cardId}`), t);

/** Today's queue, everywhere or under one page. */
export const getDueCards = (scopePageId: string | null, t: TFunction): Promise<Result<DueCards>> =>
    call(() => http().get<DueCards>('/notebook/cards/due',
        scopePageId ? { params: { scopePageId } } : undefined), t);

export const reviewCard = (cardId: string, rating: CardRating, t: TFunction): Promise<Result<ReviewResult>> =>
    call(() => http().post<ReviewResult>(`/notebook/cards/${cardId}/review`, { rating }), t);

/** The end of a session: pays today's unpaid reviews, up to the daily cap. */
export const finishReview = (t: TFunction): Promise<Result<FinishReview>> =>
    call(() => http().post<FinishReview>('/notebook/reviews/finish'), t);
