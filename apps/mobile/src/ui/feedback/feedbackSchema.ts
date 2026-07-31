import { z } from 'zod';
import type { TFunction } from 'i18next';

/** Matches `CreateFeedbackRequest.body` (minLength 1, maxLength 4000) in the API contract. */
export const FEEDBACK_BODY_MAX_LENGTH = 4000;

/**
 * R6: category and free text are the ONLY things a submission requires. Images
 * and the capture context are optional extras handled outside the schema.
 * Mirrors the web screen's schema so both apps reject the same inputs with the
 * same copy.
 */
export const feedbackSchema = (t: TFunction) =>
  z.object({
    category: z.enum(['BUG', 'FEATURE_REQUEST', 'OTHER'], {
      errorMap: () => ({ message: t('FeedbackCategoryRequired') }),
    }),
    body: z
      .string()
      .trim()
      .min(1, t('FeedbackBodyRequired'))
      .max(FEEDBACK_BODY_MAX_LENGTH, t('FeedbackBodyTooLong')),
  });

export type FeedbackFormValues = z.infer<ReturnType<typeof feedbackSchema>>;

/**
 * The form starts with NO category selected — react-hook-form needs a concrete
 * default, and the schema rejects the empty string with `FeedbackCategoryRequired`.
 */
export const NO_CATEGORY = '' as FeedbackFormValues['category'];

export const CATEGORY_ORDER: FeedbackFormValues['category'][] = ['BUG', 'FEATURE_REQUEST', 'OTHER'];
