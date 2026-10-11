import type {
    BlockMode, BlockTarget, CycleDay, LapBlockState, StudyBlock, StudyCycle, StudyTopicRef, Weekday,
} from '@beyou/types/notebook/studyCycle';

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

/** "Entender Crase" for a concept, the topic's name otherwise. */
export function blockTitle(facts: Pick<BlockFacts, 'mode' | 'target' | 'topic'>, t: Translate): string {
    return isConceptBlock(facts) ? t('StudyCycleUnderstand', { title: facts.target!.title }) : facts.topic.title;
}

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
 * @param minutesToday this block's share of today's budget, for the "Today" card; omit elsewhere
 * @param nextPosition for a block whose turn ran out, where its concept comes back
 */
export function blockFigure(
    facts: BlockFacts,
    options: { minutesToday?: number; nextPosition?: number | null; current?: boolean } = {},
): BlockFigure {
    const planned = facts.plannedMinutes;
    const timeShare = planned > 0 ? Math.min(1, facts.minutes / planned) : 0;
    const activeTone = options.current ? 'active' : 'idle';

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
            return { label: { key: 'StudyCycleFigureQuizPending' }, caption, share: 1, tone: activeTone };
        }
        if (target.progress.total > 1) {
            return {
                label: { key: 'StudyCycleFigureSubpages', values: { done: target.progress.done, total: target.progress.total } },
                caption,
                share: target.progress.done / target.progress.total,
                tone: activeTone,
            };
        }
        return {
            label: { key: facts.requireQuiz ? 'StudyCycleFigurePageQuizPending' : 'StudyCycleFigurePagePending' },
            caption,
            share: target.status === 'STUDYING' ? 0.5 : 0,
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
