import { describe, expect, it } from 'vitest';
import type { DraftNode, RoadmapDraftRecord } from '@beyou/types/notebook/notebook';
import {
    EMPTY_DRAFT_FORM, draftChoices, draftForm, draftPlan, draftRequest, draftRows, formatElapsed, topicFromDraft,
} from '../roadmapDraft';

const node = (title: string, extra: Partial<DraftNode> = {}): DraftNode => ({
    title,
    why: `Why ${title}`,
    subtopics: [`${title} basics`],
    estimatedHours: 4,
    optional: false,
    existingPageId: null,
    existingTopicTitle: null,
    existingProgress: null,
    ...extra,
});

const record = (nodes: DraftNode[] | null, choices: RoadmapDraftRecord['choices'] = null): RoadmapDraftRecord => ({
    id: 'd1',
    title: 'Algorithms',
    status: 'READY',
    request: { title: 'Algorithms', why: 'Interviews', level: 'NEW', hoursPerWeek: 3, goalId: 'g1', references: ['CLRS'] },
    result: nodes ? { nodes, totalHours: 12 } : null,
    choices,
    errorKey: null,
    startedAt: '2026-10-10T00:00:00Z',
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
});

describe('draftRows', () => {
    it('is null while there is no result yet', () => {
        expect(draftRows(record(null))).toBeNull();
    });

    it('keeps what is not optional and links what the person already has, until they decide', () => {
        const rows = draftRows(record([node('Sorting'), node('Graphs', { optional: true }), node('Heaps', { existingPageId: 'p9' })]))!;
        expect(rows.map((row) => [row.keep, row.link])).toEqual([[true, false], [false, false], [true, true]]);
    });

    it('takes the stored ticks when there is one per node, and ignores them otherwise', () => {
        const nodes = [node('Sorting'), node('Heaps', { existingPageId: 'p9' })];
        expect(draftRows(record(nodes, [{ keep: false, link: false }, { keep: true, link: false }]))!.map((row) => [row.keep, row.link]))
            .toEqual([[false, false], [true, false]]);
        expect(draftRows(record(nodes, [{ keep: false, link: false }]))!.map((row) => row.keep)).toEqual([true, true]);
    });

    it('never links a node that has no page to link', () => {
        expect(draftRows(record([node('Sorting')], [{ keep: true, link: true }]))![0].link).toBe(false);
    });
});

describe('the form and the requests', () => {
    it('puts a stored request back into the form', () => {
        expect(draftForm(record(null).request)).toEqual({ title: 'Algorithms', why: 'Interviews', level: 'NEW', hours: 3, goalId: 'g1', reference: 'CLRS' });
        expect(draftForm({ title: 'Go' })).toEqual({ ...EMPTY_DRAFT_FORM, title: 'Go' });
    });

    it('asks for a first draft with what was filled in, trimmed', () => {
        expect(draftRequest({ ...EMPTY_DRAFT_FORM, title: '  Go  ', reference: ' ' })).toEqual({
            title: 'Go', why: undefined, level: 'SOME', hoursPerWeek: 6, goalId: null, references: undefined, changeRequest: undefined, previous: undefined,
        });
    });

    it('sends the kept rows along with a change asked for in words', () => {
        const rows = draftRows(record([node('Sorting'), node('Graphs', { optional: true })]))!;
        const request = draftRequest({ ...EMPTY_DRAFT_FORM, title: 'Algorithms' }, 'split Sorting in two', rows);
        expect(request.changeRequest).toBe('split Sorting in two');
        expect(request.previous).toEqual([{ title: 'Sorting', subtopics: ['Sorting basics'] }]);
    });

    it('creates the topic from the kept rows, a linked one without subtopics', () => {
        const rows = draftRows(record([node('Sorting'), node('Graphs', { optional: true }), node('Heaps', { existingPageId: 'p9' })]))!;
        expect(topicFromDraft({ ...EMPTY_DRAFT_FORM, title: 'Algorithms', goalId: 'g1' }, rows, 'd1')).toEqual({
            title: 'Algorithms',
            description: null,
            goalId: 'g1',
            nodes: [
                { title: 'Sorting', why: 'Why Sorting', subtopics: ['Sorting basics'], estimatedHours: 4, linkPageId: null },
                { title: 'Heaps', why: 'Why Heaps', subtopics: [], estimatedHours: 4, linkPageId: 'p9' },
            ],
            draftId: 'd1',
        });
    });
});

describe('draftPlan and formatElapsed', () => {
    it('counts the kept nodes and the weeks the new ones take', () => {
        const rows = draftRows(record([node('Sorting'), node('Trees'), node('Heaps', { existingPageId: 'p9' })]))!;
        expect(draftPlan(rows, 3)).toEqual({ kept: 3, weeks: 3 });
        expect(draftPlan(rows, 0)).toEqual({ kept: 3, weeks: 0 });
        expect(draftPlan(null, 6)).toEqual({ kept: 0, weeks: 0 });
    });

    it('writes seconds as m:ss', () => {
        expect(formatElapsed(0)).toBe('0:00');
        expect(formatElapsed(75)).toBe('1:15');
    });

    it('stores one tick pair per row', () => {
        const rows = draftRows(record([node('Sorting'), node('Heaps', { existingPageId: 'p9' })]))!;
        expect(draftChoices(rows)).toEqual([{ keep: true, link: false }, { keep: true, link: true }]);
    });
});
