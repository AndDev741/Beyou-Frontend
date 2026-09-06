/**
 * A task's importance or difficulty as the server wants it: 1..5, or null for "not
 * set". The forms hold "not set" as 0 (a segmented control with nothing chosen), and
 * this is the one place that turns it into null, so a client cannot forget to.
 */
export const priorityOrNull = (value?: number | null): number | null =>
  value != null && value >= 1 ? value : null;
