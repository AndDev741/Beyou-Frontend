import type {
    BlockMode, BlockRequest, BlockTarget, CycleDay, GoalSource, LapBlockState, StudyBlock, StudyCycle, StudyHistory,
    StudyPageRef, StudyTodayCycle, StudyTopicRef, TodayEntry, Weekday,
} from '@beyou/types/notebook/studyCycle';
import { addDaysIso, weekdayIndexIso } from '../date/isoDay';
import { subjectLabel } from './studyCycleSubjects';

/**
 * How a study block reads on screen, shared by the web and the phone so a block says the same
 * thing in the notebook's "Today" card, the cycle screen, the widget and the briefing.
 *
 * Everything here is pure: it returns i18n keys with their values, and each app runs them
 * through its own `t`.
 */

type Translate = (key: string, values?: Record<string, unknown>) => string;

export const WEEKDAYS: Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/** "40 min", "1h", "1h05". Hours lead once there is a whole one, the way people say it. */
export function formatStudyMinutes(minutes: number): string {
    const total = Math.max(0, Math.round(minutes));
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    if (hours === 0) return `${rest} min`;
    return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}

/** The week's minutes: the sum of its days, never a number typed twice. */
export const weekMinutes = (days: CycleDay[]): number => days.reduce((sum, day) => sum + day.minutes, 0);

/** The days in Monday-first order, whatever order the server sent them in. */
export const orderedDays = (days: CycleDay[]): CycleDay[] =>
    [...days].sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday));

/** The fields a block's line is drawn from, common to a cycle's block and a "Today" entry. */
export type BlockFacts = {
    topic: StudyTopicRef;
    mode: BlockMode;
    plannedMinutes: number;
    /** Minutes the block holds in its lap. */
    minutes: number;
    state: LapBlockState;
    target: BlockTarget | null;
    targetPreview: boolean;
    requireQuiz: boolean;
    quizPassed: boolean | null;
};

export const factsOfBlock = (block: StudyBlock): BlockFacts => ({
    topic: block.topic,
    mode: block.mode,
    plannedMinutes: block.plannedMinutes,
    minutes: block.progress.minutes,
    state: block.progress.state,
    target: block.progress.target,
    targetPreview: block.progress.targetPreview,
    requireQuiz: block.requireQuiz,
    quizPassed: block.progress.quizPassed,
});

/** A GOAL block with somewhere to go. One with no target (the roadmap is done) runs on time. */
export const isConceptBlock = (facts: Pick<BlockFacts, 'mode' | 'target'>): boolean =>
    facts.mode === 'GOAL' && facts.target !== null;

/** "Entender Crase" for a concept, the subject's name otherwise. */
export function blockTitle(facts: Pick<BlockFacts, 'mode' | 'target' | 'topic'>, t: Translate): string {
    return isConceptBlock(facts) ? t('StudyCycleUnderstand', { title: facts.target!.title }) : facts.topic.title;
}

/**
 * The root topic to print small and muted in front of a block's title: only when the title is the
 * subject itself (not a concept) and the subject is a page inside a topic. A concept's subject,
 * root included, goes on the line below instead (see {@link blockDetail}). Null otherwise, and
 * for a server that does not send `rootTitle`.
 */
export const blockTitleRoot = (facts: Pick<BlockFacts, 'mode' | 'target' | 'topic'>): string | null =>
    isConceptBlock(facts) ? null : facts.topic.rootTitle ?? null;

export type BlockFigure = {
    /** The main line on the right of a block. */
    label: { key: string; values?: Record<string, unknown> };
    /** A smaller line under it, when there is one. */
    caption: { key: string; values?: Record<string, unknown> } | null;
    /** How full the bar is, 0..1. */
    share: number;
    tone: 'done' | 'active' | 'idle' | 'muted';
};

/**
 * The figure on the right of a block: progress in minutes for a time block, progress in
 * understanding for a concept, with the time it took second.
 *
 * The bar of an open block is always its minutes against what was planned, a concept's included.
 * A concept's bar used to follow its page's status, so a pomodoro on the page left it where it
 * was (empty for a page not started, half for one being studied) while the minutes went in, and
 * the block read as if the time had not counted. Understanding stays in the label.
 *
 * @param minutesToday this block's share of today's budget, for the "Today" card; omit elsewhere
 * @param nextPosition for a block whose turn ran out, where its concept comes back
 * @param undecided a roadmap block whose concept is picked when it comes up (see
 *                  {@link conceptUndecided}); without it, a missing concept reads as "roadmap done"
 */
export function blockFigure(
    facts: BlockFacts,
    options: { minutesToday?: number; nextPosition?: number | null; current?: boolean; undecided?: boolean } = {},
): BlockFigure {
    const planned = facts.plannedMinutes;
    const timeShare = planned > 0 ? Math.min(1, facts.minutes / planned) : 0;
    const activeTone = options.current ? 'active' : 'idle';

    if (options.undecided && facts.mode === 'GOAL' && facts.target === null && facts.state === 'OPEN') {
        return {
            label: { key: 'StudyCycleCaptionEstimate', values: { planned: formatStudyMinutes(planned) } },
            caption: null,
            share: timeShare,
            tone: activeTone,
        };
    }

    if (isConceptBlock(facts)) {
        const target = facts.target!;
        if (facts.state === 'UNDERSTOOD') {
            return {
                label: { key: 'StudyCycleFigureUnderstood', values: { minutes: formatStudyMinutes(facts.minutes) } },
                caption: { key: 'StudyCycleCaptionEstimate', values: { planned: formatStudyMinutes(planned) } },
                share: 1,
                tone: 'done',
            };
        }
        if (facts.state === 'TURN_USED') {
            return {
                label: options.nextPosition
                    ? { key: 'StudyCycleFigureTurnUsed', values: { position: options.nextPosition } }
                    : { key: 'StudyCycleFigureTurnUsedNextLap' },
                caption: { key: 'StudyCycleCaptionInvested', values: { minutes: formatStudyMinutes(facts.minutes), planned: formatStudyMinutes(planned) } },
                share: 1,
                tone: 'muted',
            };
        }
        const caption = facts.minutes > 0
            ? { key: 'StudyCycleCaptionInvested', values: { minutes: formatStudyMinutes(facts.minutes), planned: formatStudyMinutes(planned) } }
            : { key: 'StudyCycleCaptionEstimate', values: { planned: formatStudyMinutes(planned) } };
        if (target.status === 'DONE') {
            // Open with its page done: the block asks for the quiz too.
            return { label: { key: 'StudyCycleFigureQuizPending' }, caption, share: timeShare, tone: activeTone };
        }
        if (target.progress.total > 1) {
            return {
                label: { key: 'StudyCycleFigureSubpages', values: { done: target.progress.done, total: target.progress.total } },
                caption,
                share: timeShare,
                tone: activeTone,
            };
        }
        return {
            label: { key: facts.requireQuiz ? 'StudyCycleFigurePageQuizPending' : 'StudyCycleFigurePagePending' },
            caption,
            share: timeShare,
            tone: activeTone,
        };
    }

    const roadmapDone = facts.mode === 'GOAL' ? { key: 'StudyCycleCaptionRoadmapDone' } : null;
    if (facts.state === 'DONE' || facts.minutes >= planned) {
        return {
            label: { key: 'StudyCycleFigureTimeDone', values: { minutes: facts.minutes, planned } },
            caption: roadmapDone,
            share: 1,
            tone: 'done',
        };
    }
    if (options.minutesToday !== undefined && options.minutesToday < planned - facts.minutes) {
        return {
            label: { key: 'StudyCycleFigureTimeToday', values: { today: options.minutesToday, planned } },
            caption: roadmapDone,
            share: timeShare,
            tone: activeTone,
        };
    }
    if (facts.minutes > 0) {
        return {
            label: { key: 'StudyCycleFigureTimeLeft', values: { left: planned - facts.minutes, planned } },
            caption: roadmapDone,
            share: timeShare,
            tone: activeTone,
        };
    }
    return { label: { key: 'StudyCycleFigureTimePlanned', values: { planned } }, caption: roadmapDone, share: 0, tone: activeTone };
}

/** Is a lap block closed, whichever way it closed. */
export const isClosed = (state: LapBlockState): boolean => state !== 'OPEN';

/**
 * Where a turn-used concept comes back: the topic's next block in the lap after this one, or
 * null when the lap has none left (it comes back next lap).
 */
export function nextBlockOfTopic(blocks: StudyBlock[], block: StudyBlock): StudyBlock | null {
    return blocks.find((other) => other.topic.id === block.topic.id && other.position > block.position) ?? null;
}

/**
 * Which block a session on `topicId` would go to, for the "Log a session" preview: the topic's
 * first open block in the lap, else its last block (which takes the overflow). The server is the
 * one that decides; this mirrors its rule so the dialog can say it before sending.
 */
export function creditTarget(cycle: StudyCycle, topicId: string): StudyBlock | null {
    const ofTopic = cycle.blocks.filter((block) => block.topic.id === topicId);
    return ofTopic.find((block) => block.progress.state === 'OPEN') ?? ofTopic[ofTopic.length - 1] ?? null;
}

/** The share of the lap that is closed, for its bar. */
export const lapShare = (lap: { blocksClosed: number; blocks: number }): number =>
    lap.blocks > 0 ? lap.blocksClosed / lap.blocks : 0;

/** A "Today" entry as block facts, so it reads the same as that block on the cycle screen. */
export const factsOfEntry = (entry: TodayEntry): BlockFacts => ({
    topic: entry.topic,
    mode: entry.mode,
    plannedMinutes: entry.plannedMinutes,
    minutes: entry.credited,
    state: entry.state,
    target: entry.target,
    targetPreview: entry.targetPreview,
    requireQuiz: entry.requireQuiz,
    quizPassed: entry.quizPassed,
});

const STATE_LABEL_KEY: Record<LapBlockState, string> = {
    OPEN: 'StudyCycleStateOpen',
    DONE: 'StudyCycleStateDone',
    UNDERSTOOD: 'StudyCycleStateUnderstood',
    TURN_USED: 'StudyCycleStateTurnUsed',
};

/** The word for where a block stands, for the marker beside it and for screen readers. */
export const lapBlockStateLabelKey = (state: LapBlockState): string => STATE_LABEL_KEY[state];

/**
 * The page a block's "Focus 25" files the pomodoro on and its "Open" goes to: the concept it is
 * after, else the page it points at, else the topic itself. Minutes on any page of the topic
 * count for the block, so the choice is about where the person lands, not about crediting.
 */
export function blockPage(block: { target: BlockTarget | null; page: StudyPageRef | null; topic: StudyTopicRef }): { id: string; title: string } {
    const page = block.target ?? block.page ?? block.topic;
    return { id: page.id, title: page.title };
}

/** One piece of the small line under a block's title: an i18n key, or the person's own words. */
export type DetailPart = { key: string; values?: Record<string, unknown> } | { text: string };

/**
 * The small line under a block's title: which subject ("Root › Subject" when it sits inside a
 * topic) and why this page for a concept, the page or
 * the note for a time block, and how many flashcards are waiting. Parts are joined with " · ".
 */
export function blockDetail(block: {
    topic: StudyTopicRef;
    mode: BlockMode;
    goalSource: GoalSource | null;
    target: BlockTarget | null;
    targetPreview: boolean;
    page: StudyPageRef | null;
    note: string | null;
    requireQuiz: boolean;
    cardsDue?: number;
    /** See {@link conceptUndecided}. */
    undecided?: boolean;
}): DetailPart[] {
    const parts: DetailPart[] = [];
    if (block.undecided && block.mode === 'GOAL' && block.target === null) {
        parts.push({ key: 'StudyCycleDetailDecidedLater' });
    } else if (isConceptBlock(block)) {
        parts.push({ text: subjectLabel(block.topic) });
        if (block.goalSource === 'PAGE') parts.push({ key: 'StudyCycleDetailChosenPage' });
        else parts.push({ key: block.targetPreview ? 'StudyCycleDetailNextIfNothingChanges' : 'StudyCycleDetailNextOnRoadmap' });
        if (block.requireQuiz) parts.push({ key: 'StudyCycleDetailQuizRequired' });
    } else if (block.page && block.page.id !== block.topic.id) {
        parts.push({ text: block.page.title });
    }
    if (block.note) parts.push({ text: block.note });
    if (block.cardsDue && block.cardsDue > 0) parts.push({ key: 'StudyCycleDetailCardsDue', values: { count: block.cardsDue } });
    return parts;
}

/** Runs the parts through `t` and joins them the way every block line does. */
export const detailText = (parts: DetailPart[], t: Translate): string =>
    parts.map((part) => ('text' in part ? part.text : t(part.key, part.values))).join(' · ');

/**
 * The block a cycle is on today: the first one not closed today. Null once the day's slice is
 * all done.
 */
export const currentEntry = (cycle: StudyTodayCycle): TodayEntry | null =>
    cycle.entries.find((entry) => !entry.doneToday) ?? null;

/**
 * Where a concept comes back if its turn runs out: the topic's next block after this one.
 * Read from the whole cycle when it is loaded, else from the day's own slice; null when neither
 * says, which the screen words as "next lap" or leaves out.
 */
export function conceptComesBackAt(entry: TodayEntry, entries: TodayEntry[], cycle?: StudyCycle | null): number | null {
    const block = cycle?.blocks.find((candidate) => candidate.id === entry.blockId);
    if (cycle && block) return nextBlockOfTopic(cycle.blocks, block)?.position ?? null;
    return entries.find((other) => other.topic.id === entry.topic.id && other.position > entry.position && !other.nextLap)?.position ?? null;
}

/** A step of where a session's minutes would land. */
export type CreditStep = { block: StudyBlock; before: number; after: number };

/**
 * Where a session's minutes would go, block by block, for the "Log a session" preview. Mirrors the
 * server's walk (contract 2.1): the topic's open blocks in order, each filled up to its plan, and
 * whatever is left onto the topic's last block of the lap. The server decides; this only lets the
 * dialog say it before sending.
 */
export function previewCredit(cycle: StudyCycle, topicId: string, minutes: number): CreditStep[] {
    const ofTopic = cycle.blocks
        .filter((block) => block.topic.id === topicId)
        .sort((a, b) => a.position - b.position);
    if (ofTopic.length === 0 || minutes <= 0) return [];
    const steps = new Map<string, CreditStep>();
    let remaining = minutes;
    for (const block of ofTopic) {
        if (remaining <= 0) break;
        if (block.progress.state !== 'OPEN') continue;
        const take = Math.max(0, Math.min(remaining, block.plannedMinutes - block.progress.minutes));
        if (take === 0) continue;
        steps.set(block.id, { block, before: block.progress.minutes, after: block.progress.minutes + take });
        remaining -= take;
    }
    if (remaining > 0) {
        const last = ofTopic[ofTopic.length - 1];
        const step = steps.get(last.id);
        if (step) step.after += remaining;
        else steps.set(last.id, { block: last, before: last.progress.minutes, after: last.progress.minutes + remaining });
    }
    return [...steps.values()].sort((a, b) => a.block.position - b.block.position);
}

/** A block as `PUT /blocks` takes it back, settings untouched. */
export const blockRequestOf = (block: StudyBlock): BlockRequest => ({
    id: block.id,
    topicId: block.topic.id,
    mode: block.mode,
    plannedMinutes: block.plannedMinutes,
    goalSource: block.goalSource,
    pageId: block.page?.id ?? null,
    requireQuiz: block.requireQuiz,
    note: block.note,
});

/**
 * The block list with one block moved a step up (-1) or down (+1), ready for `PUT /blocks`.
 * Null when the move would leave the list.
 */
export function moveBlock(blocks: StudyBlock[], blockId: string, step: -1 | 1): BlockRequest[] | null {
    const ordered = [...blocks].sort((a, b) => a.position - b.position);
    const from = ordered.findIndex((block) => block.id === blockId);
    const to = from + step;
    if (from < 0 || to < 0 || to >= ordered.length) return null;
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    return ordered.map(blockRequestOf);
}

/**
 * A topic's weight in the planner: importance times what is left to learn. The server computes
 * the same (contract 2.6); the editor shows it at once while the plan is on its way.
 */
export const topicWeight = (importance: number, mastery: number): number => importance * (6 - mastery);

/** The weekday of a "YYYY-MM-DD" day, in the cycle's names. */
export const weekdayOf = (iso: string): Weekday => WEEKDAYS[(weekdayIndexIso(iso) + 6) % 7];

/** The Monday of the week holding `iso`; the history moves a week at a time from it. */
export const mondayOf = (iso: string): string => addDaysIso(iso, -((weekdayIndexIso(iso) + 6) % 7));

/** Seven days from `monday`. */
export const weekFrom = (monday: string): string[] => Array.from({ length: 7 }, (_, index) => addDaysIso(monday, index));

/** A history window in sums: minutes studied, minutes the week asked for, concepts understood. */
export function historyTotals(history: StudyHistory): { minutes: number; planned: number; understood: number } {
    return history.days.reduce(
        (sum, day) => ({
            minutes: sum.minutes + day.minutes,
            planned: sum.planned + day.plannedMinutes,
            understood: sum.understood + day.entries.filter((entry) => entry.kind === 'UNDERSTOOD').length,
        }),
        { minutes: 0, planned: 0, understood: 0 },
    );
}

/** What {@link conceptUndecided} reads of a block or a "Today" entry. */
type ConceptSlot = {
    topic: { id: string };
    position: number;
    mode: BlockMode;
    goalSource: GoalSource | null;
    state: LapBlockState;
    target: BlockTarget | null;
};

const slotOfBlock = (block: StudyBlock): ConceptSlot => ({
    topic: block.topic, position: block.position, mode: block.mode, goalSource: block.goalSource,
    state: block.progress.state, target: block.progress.target,
});

/**
 * A roadmap block (NEXT) whose concept is not picked yet. The server fixes the concept of each
 * topic's first open GOAL block (contract 2.3) and may only preview the later ones, so a later
 * block with no concept is waiting for its turn. Only the first one having none means the
 * roadmap has nothing left.
 */
function conceptUndecidedIn(slots: ConceptSlot[], slot: ConceptSlot): boolean {
    if (slot.mode !== 'GOAL' || slot.goalSource === 'PAGE' || slot.target !== null || slot.state !== 'OPEN') return false;
    return slots.some((other) =>
        other.topic.id === slot.topic.id && other.position < slot.position && other.mode === 'GOAL' && other.state === 'OPEN');
}

/** {@link conceptUndecidedIn} for a block of the cycle screen. */
export const conceptUndecided = (blocks: StudyBlock[], block: StudyBlock): boolean =>
    conceptUndecidedIn(blocks.map(slotOfBlock), slotOfBlock(block));

/**
 * {@link conceptUndecidedIn} for a "Today" entry, read from the day's slice. A roadmap block from
 * the next lap is always undecided: nothing of that lap has been resolved yet.
 */
export function entryConceptUndecided(entries: TodayEntry[], entry: TodayEntry): boolean {
    if (entry.nextLap) return entry.mode === 'GOAL' && entry.goalSource !== 'PAGE' && entry.target === null;
    return conceptUndecidedIn(entries.filter((other) => !other.nextLap && !other.doneToday), entry);
}
