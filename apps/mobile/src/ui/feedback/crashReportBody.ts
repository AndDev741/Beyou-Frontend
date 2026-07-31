import { FEEDBACK_BODY_MAX_LENGTH } from './feedbackSchema';

/** Reported as the `screen` of a crash report — the real one is already gone. */
export const CRASH_REPORT_SCREEN = 'error-boundary';

type CrashReportInput = {
  /** Whatever the user chose to type. Optional — the diagnostics stand alone. */
  note?: string;
  error: unknown;
  componentStack?: string;
};

const describe = (error: unknown): string => {
  if (error instanceof Error) {
    const headline = `${error.name}: ${error.message}`;
    // `stack` normally starts with the same headline — printing both would just
    // burn characters out of the 4000-char budget.
    return error.stack?.startsWith(error.name) ? error.stack : [headline, error.stack].filter(Boolean).join('\n');
  }
  return String(error);
};

/**
 * KTD3: on the crash path the report carries the error text and the component
 * stack instead of a screenshot. The user's note goes FIRST so a human reading
 * the inbox sees the human sentence before the stack trace.
 */
export const buildCrashReportBody = ({ note, error, componentStack }: CrashReportInput): string => {
  const sections = [
    note?.trim(),
    '--- crash details ---',
    describe(error),
    componentStack?.trim(),
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n').slice(0, FEEDBACK_BODY_MAX_LENGTH);
};
