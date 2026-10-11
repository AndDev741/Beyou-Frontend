import { describe, expect, it } from 'vitest';
import type { BlockTarget, StudyBlock, StudyCycle } from '@beyou/types/notebook/studyCycle';
import {
    blockFigure, blockTitle, creditTarget, formatStudyMinutes, nextBlockOfTopic, orderedDays, weekMinutes,
    type BlockFacts,
} from '../studyCycleView';

const topic = { id: 'const', title: 'Dir. Constitucional', icon: null };
const target = (over: Partial<BlockTarget> = {}): BlockTarget => ({
    id: 'p1', title: 'Controle de constitucionalidade', icon: null, status: 'STUDYING',
    progress: { done: 2, total: 5 }, ...over,
});
const facts = (over: Partial<BlockFacts> = {}): BlockFacts => ({
    topic, mode: 'TIME', plannedMinutes: 70, minutes: 0, state: 'OPEN', target: null,
    targetPreview: false, requireQuiz: false, quizPassed: null, ...over,
});

const block = (id: string, topicId: string, position: number, state: StudyBlock['progress']['state'] = 'OPEN'): StudyBlock => ({
    id, position, topic: { id: topicId, title: topicId, icon: null }, mode: 'TIME', plannedMinutes: 60,
    goalSource: null, page: null, requireQuiz: false, note: null,
    progress: { lapNumber: 1, minutes: 0, state, closedAt: null, target: null, targetPreview: false, quizPassed: null },
});

describe('study cycle view', () => {
    it('writes minutes the way people say them', () => {
        expect(formatStudyMinutes(40)).toBe('40 min');
        expect(formatStudyMinutes(60)).toBe('1h');
        expect(formatStudyMinutes(65)).toBe('1h05');
        expect(formatStudyMinutes(1085)).toBe('18h05');
        expect(formatStudyMinutes(-3)).toBe('0 min');
    });

    it('sums the week and orders it from Monday', () => {
        const days = [
            { weekday: 'SUNDAY' as const, minutes: 0, startTime: null },
            { weekday: 'MONDAY' as const, minutes: 180, startTime: '19:00' },
            { weekday: 'SATURDAY' as const, minutes: 240, startTime: '09:00' },
        ];
        expect(weekMinutes(days)).toBe(420);
        expect(orderedDays(days).map((d) => d.weekday)).toEqual(['MONDAY', 'SATURDAY', 'SUNDAY']);
    });

    it('names a concept block by its page and a time block by its topic', () => {
        const t = (key: string, values?: Record<string, unknown>) => `${key}:${values?.title ?? ''}`;
        expect(blockTitle(facts({ mode: 'GOAL', target: target() }), t)).toBe('StudyCycleUnderstand:Controle de constitucionalidade');
        expect(blockTitle(facts(), t)).toBe('Dir. Constitucional');
        // A NEXT block on a finished roadmap has no target and is studied on time.
        expect(blockTitle(facts({ mode: 'GOAL', target: null }), t)).toBe('Dir. Constitucional');
    });

    it('leads a time block with its minutes', () => {
        expect(blockFigure(facts()).label).toEqual({ key: 'StudyCycleFigureTimePlanned', values: { planned: 70 } });
        expect(blockFigure(facts({ minutes: 30 })).label).toEqual({ key: 'StudyCycleFigureTimeLeft', values: { left: 40, planned: 70 } });
        const done = blockFigure(facts({ minutes: 80, state: 'DONE' }));
        expect(done.label).toEqual({ key: 'StudyCycleFigureTimeDone', values: { minutes: 80, planned: 70 } });
        expect(done.tone).toBe('done');
        // Today only takes part of the block.
        expect(blockFigure(facts({ plannedMinutes: 75 }), { minutesToday: 70 }).label)
            .toEqual({ key: 'StudyCycleFigureTimeToday', values: { today: 70, planned: 75 } });
    });

    it('leads a concept block with understanding and puts the time second', () => {
        const open = blockFigure(facts({ mode: 'GOAL', target: target(), minutes: 30 }), { current: true });
        expect(open.label).toEqual({ key: 'StudyCycleFigureSubpages', values: { done: 2, total: 5 } });
        expect(open.caption).toEqual({ key: 'StudyCycleCaptionInvested', values: { minutes: '30 min', planned: '1h10' } });
        expect(open.share).toBeCloseTo(0.4);
        expect(open.tone).toBe('active');

        const understood = blockFigure(facts({ mode: 'GOAL', target: target({ status: 'DONE' }), minutes: 55, state: 'UNDERSTOOD' }));
        expect(understood.label).toEqual({ key: 'StudyCycleFigureUnderstood', values: { minutes: '55 min' } });
        expect(understood.tone).toBe('done');

        const waitingQuiz = blockFigure(facts({ mode: 'GOAL', target: target({ status: 'DONE' }), requireQuiz: true, quizPassed: false }));
        expect(waitingQuiz.label.key).toBe('StudyCycleFigureQuizPending');

        const leaf = blockFigure(facts({ mode: 'GOAL', target: target({ progress: { done: 0, total: 1 }, status: 'TO_STUDY' }), requireQuiz: true }));
        expect(leaf.label.key).toBe('StudyCycleFigurePageQuizPending');
    });

    it('says where a concept comes back when its turn ran out', () => {
        const used = facts({ mode: 'GOAL', target: target(), minutes: 85, plannedMinutes: 85, state: 'TURN_USED' });
        expect(blockFigure(used, { nextPosition: 10 }).label).toEqual({ key: 'StudyCycleFigureTurnUsed', values: { position: 10 } });
        expect(blockFigure(used).label).toEqual({ key: 'StudyCycleFigureTurnUsedNextLap' });
        expect(blockFigure(used).tone).toBe('muted');
    });

    it('marks a review-time block when the roadmap has nothing left', () => {
        const review = blockFigure(facts({ mode: 'GOAL', target: null, minutes: 20 }));
        expect(review.label.key).toBe('StudyCycleFigureTimeLeft');
        expect(review.caption).toEqual({ key: 'StudyCycleCaptionRoadmapDone' });
    });

    it("sends a session to the topic's first open block, else its last", () => {
        const blocks = [block('a', 'port', 1, 'DONE'), block('b', 'const', 2), block('c', 'port', 3), block('d', 'port', 4)];
        const cycle = { blocks } as unknown as StudyCycle;
        expect(creditTarget(cycle, 'port')?.id).toBe('c');
        const allClosed = { blocks: blocks.map((b) => ({ ...b, progress: { ...b.progress, state: 'DONE' as const } })) } as unknown as StudyCycle;
        expect(creditTarget(allClosed, 'port')?.id).toBe('d');
        expect(creditTarget(cycle, 'nothing')).toBeNull();
        expect(nextBlockOfTopic(blocks, blocks[0])?.id).toBe('c');
        expect(nextBlockOfTopic(blocks, blocks[3])).toBeNull();
    });
});
