import { describe, expect, it } from 'vitest';
import type { BlockTarget, StudyBlock, StudyCycle, StudyHistory, TodayEntry } from '@beyou/types/notebook/studyCycle';
import {
    blockDetail, blockFigure, blockPage, blockTitle, conceptComesBackAt, conceptUndecided, creditTarget, currentEntry, detailText,
    entryConceptUndecided,
    factsOfBlock, factsOfEntry, formatStudyMinutes, historyTotals, mondayOf, moveBlock, nextBlockOfTopic, orderedDays, previewCredit,
    topicWeight, weekdayOf, weekFrom, weekMinutes,
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

    it('reads a Today entry with the minutes its block already holds', () => {
        const entry = todayEntry('b1', 'const', 7, { credited: 30, mode: 'GOAL', target: target() });
        const read = factsOfEntry(entry);
        expect(read.minutes).toBe(30);
        expect(blockFigure(read, { minutesToday: 40, current: true }).label.key).toBe('StudyCycleFigureSubpages');
    });

    it('opens the concept, else the chosen page, else the topic', () => {
        const page = { id: 'pg', title: 'Integrais', icon: null };
        expect(blockPage({ target: target(), page, topic })).toEqual({ id: 'p1', title: 'Controle de constitucionalidade' });
        expect(blockPage({ target: null, page, topic })).toEqual({ id: 'pg', title: 'Integrais' });
        expect(blockPage({ target: null, page: null, topic })).toEqual({ id: 'const', title: 'Dir. Constitucional' });
    });

    it('says why a concept was picked and what a time block is about', () => {
        const t = (key: string, values?: Record<string, unknown>) => (values?.count !== undefined ? `${key}:${values.count}` : key);
        const base = { topic, goalSource: null, target: null, targetPreview: false, page: null, note: null, requireQuiz: false };
        expect(detailText(blockDetail({ ...base, mode: 'GOAL', goalSource: 'NEXT', target: target(), cardsDue: 12 }), t))
            .toBe('Dir. Constitucional · StudyCycleDetailNextOnRoadmap · StudyCycleDetailCardsDue:12');
        expect(detailText(blockDetail({ ...base, mode: 'GOAL', goalSource: 'PAGE', target: target(), requireQuiz: true }), t))
            .toBe('Dir. Constitucional · StudyCycleDetailChosenPage · StudyCycleDetailQuizRequired');
        expect(detailText(blockDetail({ ...base, mode: 'GOAL', goalSource: 'NEXT', target: target(), targetPreview: true }), t))
            .toBe('Dir. Constitucional · StudyCycleDetailNextIfNothingChanges');
        expect(detailText(blockDetail({ ...base, mode: 'TIME', note: 'Lista de questões FCC' }), t)).toBe('Lista de questões FCC');
        expect(detailText(blockDetail({ ...base, mode: 'TIME', page: { id: 'pg', title: 'Integrais', icon: null } }), t)).toBe('Integrais');
        // The topic itself as the page adds nothing the title does not already say.
        expect(blockDetail({ ...base, mode: 'TIME', page: { id: 'const', title: 'Dir. Constitucional', icon: null } })).toEqual([]);
    });

    it('finds the block the day is on and where its concept comes back', () => {
        const entries = [
            todayEntry('a', 'port', 6, { doneToday: true, state: 'DONE' }),
            todayEntry('b', 'const', 7),
            todayEntry('c', 'port', 8),
            todayEntry('d', 'const', 1, { nextLap: true }),
        ];
        const day = { entries } as unknown as Parameters<typeof currentEntry>[0];
        expect(currentEntry(day)?.blockId).toBe('b');
        expect(currentEntry({ entries: [entries[0]] } as unknown as Parameters<typeof currentEntry>[0])).toBeNull();
        // From the slice: the next lap's blocks do not count as this lap's comeback.
        expect(conceptComesBackAt(entries[1], entries)).toBeNull();
        // From the whole cycle when it is loaded.
        const cycle = { blocks: [block('b', 'const', 7), block('x', 'const', 12)] } as unknown as StudyCycle;
        expect(conceptComesBackAt(entries[1], entries, cycle)).toBe(12);
    });

    it('previews a session the way the server credits it: fill, spill, leftover on the last', () => {
        const withMinutes = (b: StudyBlock, minutes: number, planned = 60): StudyBlock =>
            ({ ...b, plannedMinutes: planned, progress: { ...b.progress, minutes } });
        const blocks = [
            withMinutes(block('a', 'port', 1, 'DONE'), 60),
            withMinutes(block('b', 'port', 3), 40),
            withMinutes(block('c', 'const', 4), 0),
            withMinutes(block('d', 'port', 6), 0, 30),
        ];
        const cycle = { blocks } as unknown as StudyCycle;
        expect(previewCredit(cycle, 'port', 10).map((s) => [s.block.id, s.before, s.after])).toEqual([['b', 40, 50]]);
        expect(previewCredit(cycle, 'port', 45).map((s) => [s.block.id, s.before, s.after])).toEqual([['b', 40, 60], ['d', 0, 25]]);
        // Past every open block, the rest lands on the topic's last block ("80 of 70 min").
        expect(previewCredit(cycle, 'port', 70).map((s) => [s.block.id, s.before, s.after])).toEqual([['b', 40, 60], ['d', 0, 50]]);
        expect(previewCredit(cycle, 'nobody', 30)).toEqual([]);
        expect(previewCredit(cycle, 'port', 0)).toEqual([]);
    });

    it('moves a block one step and refuses to leave the list', () => {
        const blocks = [block('a', 'port', 1), block('b', 'const', 2), block('c', 'port', 3)];
        expect(moveBlock(blocks, 'b', -1)?.map((b) => b.id)).toEqual(['b', 'a', 'c']);
        expect(moveBlock(blocks, 'b', 1)?.map((b) => b.id)).toEqual(['a', 'c', 'b']);
        expect(moveBlock(blocks, 'a', -1)).toBeNull();
        expect(moveBlock(blocks, 'c', 1)).toBeNull();
        expect(moveBlock(blocks, 'b', 1)?.[0]).toEqual({
            id: 'a', topicId: 'port', mode: 'TIME', plannedMinutes: 60, goalSource: null, pageId: null, requireQuiz: false, note: null,
        });
    });

    it('weighs a topic by importance and what is left to learn', () => {
        expect(topicWeight(5, 2)).toBe(20);
        expect(topicWeight(2, 4)).toBe(4);
    });

    it('walks weeks from Monday', () => {
        expect(weekdayOf('2026-10-14')).toBe('WEDNESDAY');
        expect(weekdayOf('2026-10-11')).toBe('SUNDAY');
        expect(mondayOf('2026-10-14')).toBe('2026-10-12');
        expect(mondayOf('2026-10-11')).toBe('2026-10-05');
        expect(weekFrom('2026-10-12')).toEqual([
            '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
        ]);
    });

    it('sums a history window', () => {
        const history = {
            days: [
                { date: '2026-10-10', plannedMinutes: 240, minutes: 270, byTopic: [], entries: [
                    { kind: 'UNDERSTOOD', at: '', topic, page: null, minutes: 75 },
                    { kind: 'LAP_CLOSED', at: '', lapNumber: 3 },
                ] },
                { date: '2026-10-11', plannedMinutes: 0, minutes: 30, byTopic: [], entries: [] },
            ],
        } as unknown as StudyHistory;
        expect(historyTotals(history)).toEqual({ minutes: 300, planned: 240, understood: 1 });
    });
});

describe('a roadmap block with no concept yet', () => {
    const goal = (id: string, topicId: string, position: number, state: StudyBlock['progress']['state'] = 'OPEN', withTarget = false): StudyBlock => {
        const base = block(id, topicId, position, state);
        return { ...base, mode: 'GOAL', goalSource: 'NEXT', progress: { ...base.progress, target: withTarget ? target() : null } };
    };

    it('waits for its turn behind an open concept of the same topic', () => {
        const blocks = [goal('a', 'const', 1, 'OPEN', true), block('b', 'port', 2), goal('c', 'const', 3)];
        expect(conceptUndecided(blocks, blocks[2])).toBe(true);
        // The first open one with none: the roadmap really has nothing left.
        expect(conceptUndecided([goal('x', 'const', 1)], goal('x', 'const', 1))).toBe(false);
        // Behind a closed one it is the first open one again.
        const afterClosed = [goal('a', 'const', 1, 'UNDERSTOOD', true), goal('c', 'const', 3)];
        expect(conceptUndecided(afterClosed, afterClosed[1])).toBe(false);
    });

    it('reads as an estimate, not as a finished roadmap', () => {
        const facts = factsOfBlock(goal('c', 'const', 3));
        expect(blockFigure(facts, { undecided: true })).toEqual({
            label: { key: 'StudyCycleCaptionEstimate', values: { planned: '1h' } }, caption: null, share: 0, tone: 'idle',
        });
        expect(blockFigure(facts).caption).toEqual({ key: 'StudyCycleCaptionRoadmapDone' });
        const base = { topic, mode: 'GOAL' as const, goalSource: 'NEXT' as const, target: null, targetPreview: false, page: null, note: null, requireQuiz: false };
        expect(blockDetail({ ...base, undecided: true })).toEqual([{ key: 'StudyCycleDetailDecidedLater' }]);
        expect(blockDetail(base)).toEqual([]);
    });

    it('works the same on the day\'s slice, and a next-lap roadmap block is always undecided', () => {
        const first = todayEntry('a', 'const', 7, { mode: 'GOAL', goalSource: 'NEXT', target: target() });
        const later = todayEntry('c', 'const', 12, { mode: 'GOAL', goalSource: 'NEXT' });
        const nextLap = todayEntry('n', 'const', 1, { mode: 'GOAL', goalSource: 'NEXT', nextLap: true });
        expect(entryConceptUndecided([first, later, nextLap], later)).toBe(true);
        expect(entryConceptUndecided([first, later, nextLap], nextLap)).toBe(true);
        expect(entryConceptUndecided([later], later)).toBe(false);
    });
});

function todayEntry(blockId: string, topicId: string, position: number, over: Partial<TodayEntry> = {}): TodayEntry {
    return {
        blockId, position, topic: { id: topicId, title: topicId, icon: null }, mode: 'TIME', goalSource: null, page: null,
        note: null, requireQuiz: false, plannedMinutes: 60, credited: 0, minutesToday: 60, state: 'OPEN', doneToday: false,
        nextLap: false, start: null, end: null, target: null, targetPreview: false, quizPassed: null, cardsDue: 0, ...over,
    };
}
