import type {
  BlockMode, BlockRequest, BlockTarget, GoalSource, StudyBlock, StudyPageRef, StudyTopicRef, Weekday,
} from '@beyou/types/notebook/studyCycle';
import type { NotebookTree } from '@beyou/types/notebook/notebook';
import type { Theme } from '@beyou/theme';
import { WEEKDAYS, isConceptBlock, todayInZone, type BlockFigure } from '@beyou/state';

/**
 * The phone's wording and arithmetic for the study cycle that `studyCycleView` does not cover.
 * Pure, so the screens and the tests share it. Candidates to move into `@beyou/state` once the
 * web settles on the same lines.
 */

type Translate = (key: string, values?: Record<string, unknown>) => string;

/** A figure from `blockFigure`, run through `t`. */
export function figureText(figure: BlockFigure, t: Translate): { label: string; caption: string | null } {
  return {
    label: t(figure.label.key, figure.label.values),
    caption: figure.caption ? t(figure.caption.key, figure.caption.values) : null,
  };
}

/** What a block's second line is made of, common to a cycle's block and a "Today" entry. */
export type SublineFacts = {
  topic: StudyTopicRef;
  mode: BlockMode;
  goalSource: GoalSource | null;
  page: StudyPageRef | null;
  note: string | null;
  requireQuiz: boolean;
  target: BlockTarget | null;
  cardsDue?: number;
};

/**
 * The line under a block's title: for a concept, its subject and where the concept came from;
 * for a time block, the page or the note it carries. Cards due close the line on "Today".
 */
export function blockSubline(facts: SublineFacts, t: Translate): string {
  const parts: string[] = [];
  if (isConceptBlock(facts)) {
    parts.push(facts.topic.title);
    parts.push(t(facts.goalSource === 'PAGE' ? 'StudyCycleMobileSourcePage' : 'StudyCycleMobileSourceNext'));
    if (facts.requireQuiz) parts.push(t('StudyCycleMobileQuizRequired'));
    if (facts.note) parts.push(facts.note);
  } else {
    if (facts.mode === 'GOAL' && facts.goalSource !== 'PAGE' && !facts.target) {
      parts.push(t('StudyCycleMobileNextUndecided'));
    }
    if (facts.page) parts.push(facts.page.title);
    if (facts.note) parts.push(facts.note);
  }
  if (facts.cardsDue && facts.cardsDue > 0) parts.push(t('StudyCycleMobileCardsDue', { count: facts.cardsDue }));
  return parts.join(' · ');
}

/** The page a block studies on: its concept, else the page it carries, else its topic. */
export function studyPageOf(facts: { topic: StudyTopicRef; page: StudyPageRef | null; target: BlockTarget | null }): {
  id: string;
  title: string;
} {
  const page = facts.target ?? facts.page ?? facts.topic;
  return { id: page.id, title: page.title };
}

/** A block as `PUT /blocks` wants it back, keeping everything the block already says. */
export function blockRequestOf(block: StudyBlock): BlockRequest {
  return {
    id: block.id,
    topicId: block.topic.id,
    mode: block.mode,
    plannedMinutes: block.plannedMinutes,
    goalSource: block.goalSource,
    pageId: block.page?.id ?? null,
    requireQuiz: block.requireQuiz,
    note: block.note,
  };
}

/** The blocks with the one at `index` moved one step `direction`, or null at either end. */
export function moveBlock(blocks: StudyBlock[], index: number, direction: -1 | 1): StudyBlock[] | null {
  const to = index + direction;
  if (index < 0 || index >= blocks.length || to < 0 || to >= blocks.length) return null;
  const next = [...blocks];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** A page in a topic's picker, indented by how deep it sits under the topic. */
export type PageOption = { id: string; title: string; depth: number };

/**
 * The topic and every page under it, depth first in the order the tree keeps. Pages that only
 * point at another topic's page are left out: a block's page must belong to its own topic.
 */
export function topicPages(topic: { id: string; title: string }, tree: NotebookTree | undefined): PageOption[] {
  const options: PageOption[] = [{ id: topic.id, title: topic.title, depth: 0 }];
  if (!tree) return options;
  const own = tree.items.filter((item) => !item.linked);
  const children = (parentId: string) =>
    own.filter((item) => item.parentId === parentId).sort((a, b) => a.position - b.position);
  const walk = (parentId: string, depth: number) => {
    for (const item of children(parentId)) {
      options.push({ id: item.id, title: item.title, depth });
      walk(item.id, depth + 1);
    }
  };
  walk(topic.id, 1);
  return options;
}

const REFERENCE_MONDAY = Date.UTC(2024, 0, 1, 12); // 1 Jan 2024 was a Monday.

/** The weekday in the app language ("Mon", "seg."), from the backend's enum. */
export function weekdayLabel(weekday: Weekday, language: string, width: 'short' | 'long' = 'short'): string {
  const date = new Date(REFERENCE_MONDAY + WEEKDAYS.indexOf(weekday) * 86_400_000);
  return new Intl.DateTimeFormat(language, { weekday: width, timeZone: 'UTC' }).format(date);
}

/** The backend's weekday for a "YYYY-MM-DD". */
export function weekdayOfIso(iso: string): Weekday {
  const sundayFirst = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return WEEKDAYS[(sundayFirst + 6) % 7];
}

/** The Monday of the week holding `iso`. */
export function mondayOf(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const back = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}

/** A "YYYY-MM-DD" in the app language, read as a calendar day (no timezone shift). */
export function formatIsoDay(iso: string, language: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
}

/**
 * The clock time of an instant in the person's zone, "14:05". Falls back to the phone's zone
 * when the saved one is missing or unknown to the engine.
 */
export function formatClock(at: string, language: string, timeZone?: string | null): string {
  // h23, not hour12: false, which some engines print as "24:05" after midnight.
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  try {
    return new Intl.DateTimeFormat(language, timeZone ? { ...options, timeZone } : options).format(new Date(at));
  } catch {
    return new Intl.DateTimeFormat(language, options).format(new Date(at));
  }
}

/** The calendar day of an instant in the person's zone, "YYYY-MM-DD". */
export const isoDayOf = (at: string, timeZone?: string | null): string => todayInZone(timeZone, new Date(at));

/**
 * One colour per topic for the history bars, from the theme so it holds in both bases. Past the
 * palette the colours come round again, faded, so ten topics never share an exact one.
 */
export function topicColor(index: number, theme: Theme): { color: string; opacity: number } {
  const palette = [theme.accent, theme.success, theme.xp, theme.flame, theme.text2, theme.danger];
  return { color: palette[index % palette.length], opacity: index < palette.length ? 1 : 0.55 };
}

/** The four quick choices for a session's length, in minutes. */
export const SESSION_MINUTES = [25, 45, 60, 90];

/** The block sizes the editor offers; a cycle saved with another one keeps it as a fourth. */
export const MAX_BLOCK_CHOICES = [60, 90, 120];

/** How far back a session may be dated. The server refuses older ones. */
export const SESSION_DAYS_BACK = 30;

/** How long the editor waits after the last change before asking the server for the plan. */
export const PLAN_DEBOUNCE_MS = 300;
