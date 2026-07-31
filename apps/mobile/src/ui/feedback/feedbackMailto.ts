import type { TFunction } from 'i18next';
import type { FeedbackCategory, FeedbackContext } from '@beyou/api';
import { FEEDBACK_EMAIL } from './feedbackConfig';

export const FEEDBACK_CATEGORY_LABEL_KEYS: Record<FeedbackCategory, string> = {
  BUG: 'FeedbackCategoryBug',
  FEATURE_REQUEST: 'FeedbackCategoryFeature',
  OTHER: 'FeedbackCategoryOther',
};

type MailtoInput = {
  category?: FeedbackCategory | '';
  body: string;
  context?: FeedbackContext;
  t: TFunction;
  email?: string;
};

const formatContext = (context?: FeedbackContext): string => {
  if (!context) return '';
  return Object.entries(context)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${value}`)
    .join(' · ');
};

/**
 * Builds a `mailto:` that already carries the category, the automatic capture
 * context and whatever the user typed, so the email the user sends is the same
 * report the API would have received. Mirrors the web builder — the two apps
 * must produce the same message for the same report.
 */
export const buildFeedbackMailtoHref = ({
  category,
  body,
  context,
  t,
  email = FEEDBACK_EMAIL,
}: MailtoInput): string => {
  const categoryLabel = category ? t(FEEDBACK_CATEGORY_LABEL_KEYS[category]) : '';
  const subject = t('FeedbackMailSubject', { category: categoryLabel });

  const contextLine = formatContext(context);
  const lines = [
    `${t('FeedbackMailCategoryLine')}: ${categoryLabel}`,
    ...(contextLine ? [`${t('FeedbackMailContextLine')}: ${contextLine}`] : []),
    '',
    body,
  ];

  // Hand-rolled rather than URLSearchParams: that encodes spaces as "+", and
  // RFC 6068 mailto readers show a literal "+" instead of a space.
  const query = [
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(lines.join('\n'))}`,
  ].join('&');

  return `mailto:${email}?${query}`;
};
