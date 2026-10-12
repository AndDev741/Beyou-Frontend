import { describe, expect, it } from 'vitest';
import type { NotebookTree, TreeItem } from '@beyou/types/notebook/notebook';
import {
    forestOfTrees, subjectForest, subjectLabel, subjectOptions, subjectSubtree,
} from '../studyCycleSubjects';

const item = (id: string, parentId: string, position: number, over: Partial<TreeItem> = {}): TreeItem => ({
    id, parentId, title: id, icon: null, status: 'TO_STUDY', onBoard: true, linked: false,
    progress: { done: 0, total: 1 }, position, ...over,
});

const tree = (id: string, title: string, items: TreeItem[]): NotebookTree => ({
    topic: { id, title, icon: null }, items, sourcesCount: 0, cardsDue: 0,
});

/**
 * Two roots, the shape of the notebook the follow-up was reported on, plus a third whose tree has
 * not arrived. Items are listed out of order on purpose: the sidebar order comes from `position`.
 * "gram" lives in Espanhol and is also linked onto the Software Engineer board.
 */
const se = tree('se', 'Software Engineer', [
    item('impl', 'se', 1),
    item('algo', 'fund', 1),
    item('fund', 'se', 0),
    item('redes', 'fund', 0),
    item('testes', 'impl', 0),
    item('prod', 'se', 2),
    item('gram', 'se', 3, { linked: true }),
]);
const es = tree('es', 'Espanhol C1', [
    item('gram', 'es', 0),
    item('subj', 'gram', 0),
    item('voc', 'es', 1),
]);
const roots = [
    { id: 'se', title: 'Software Engineer', icon: null },
    { id: 'es', title: 'Espanhol C1', icon: null },
    { id: 'rx', title: 'Química', icon: null },
];
const trees = { se, es };

const reasons = (options: ReturnType<typeof subjectOptions>) =>
    Object.fromEntries(options.map((option) => [option.id, option.disabledReason]));

describe('study cycle subjects', () => {
    it('lists every root followed by its own pages, depth first in sidebar order', () => {
        const forest = subjectForest(roots, trees);
        expect(forest.map((node) => [node.id, node.depth])).toEqual([
            ['se', 0], ['fund', 1], ['redes', 2], ['algo', 2], ['impl', 1], ['testes', 2], ['prod', 1],
            ['es', 0], ['gram', 1], ['subj', 2], ['voc', 1],
            // No tree yet: the root alone, still pickable.
            ['rx', 0],
        ]);
        // The linked node on the Software Engineer board is listed once, under its home.
        expect(forest.filter((node) => node.id === 'gram')).toHaveLength(1);
        expect(forest.find((node) => node.id === 'gram')).toMatchObject({ rootId: 'es', rootTitle: 'Espanhol C1', parentId: 'es' });
        // A root carries no root title, the way the server's refs say it.
        expect(forest[0]).toMatchObject({ id: 'se', rootId: 'se', rootTitle: null, parentId: null });
    });

    it('offers everything when nothing is picked or taken', () => {
        expect(subjectOptions({ roots, trees, picked: [] }).every((option) => option.disabledReason === null)).toBe(true);
    });

    it('closes a picked subject, the pages inside it and the pages that hold it', () => {
        const options = reasons(subjectOptions({ roots, trees, picked: ['impl'] }));
        expect(options.impl).toBe('picked');
        expect(options.testes).toBe('overlapsPicked');
        expect(options.se).toBe('overlapsPicked');
        // Siblings, cousins and the other root stay open.
        expect(options.fund).toBeNull();
        expect(options.redes).toBeNull();
        expect(options.prod).toBeNull();
        expect(options.es).toBeNull();
    });

    it('closes what overlaps another cycle\'s subject, naming that cycle', () => {
        const options = reasons(subjectOptions({ roots, trees, picked: [], taken: { gram: 'Intercâmbio' } }));
        expect(options.gram).toEqual({ takenBy: 'Intercâmbio' });
        expect(options.subj).toEqual({ takenBy: 'Intercâmbio' });
        expect(options.es).toEqual({ takenBy: 'Intercâmbio' });
        expect(options.voc).toBeNull();
        expect(options.se).toBeNull();
    });

    it('names the nearest holder when a page sits under one cycle\'s subject and above another\'s', () => {
        // Broken data the server tolerates (a page moved after both were picked, contract 10.7).
        const options = reasons(subjectOptions({ roots, trees, picked: [], taken: { se: 'Carreira', redes: 'Faculdade' } }));
        expect(options.redes).toEqual({ takenBy: 'Faculdade' });
        expect(options.fund).toEqual({ takenBy: 'Carreira' });
        expect(options.prod).toEqual({ takenBy: 'Carreira' });
    });

    it('reports this cycle\'s pick before another cycle\'s hold', () => {
        const options = reasons(subjectOptions({ roots, trees, picked: ['fund'], taken: { algo: 'Faculdade' } }));
        expect(options.algo).toBe('overlapsPicked');
        expect(options.fund).toBe('picked');
    });

    it('matches only the page itself for a subject in no loaded tree', () => {
        const options = reasons(subjectOptions({ roots, trees, picked: ['nowhere'], taken: { rx: 'Vestibular' } }));
        expect(options.rx).toEqual({ takenBy: 'Vestibular' });
        expect(Object.values(options).filter((reason) => reason !== null)).toHaveLength(1);
    });

    it('carries the root and depth a picked option needs for its row', () => {
        const testes = subjectOptions({ roots, trees, picked: [] }).find((option) => option.id === 'testes');
        expect(testes).toEqual({
            id: 'testes', title: 'testes', icon: null, rootId: 'se', rootTitle: 'Software Engineer', depth: 2, disabledReason: null,
        });
    });

    it('gives a subject\'s own subtree to the page pickers, the subject first', () => {
        const forest = subjectForest(roots, trees);
        expect(subjectSubtree(forest, 'fund').map((node) => [node.id, node.depth])).toEqual([['fund', 0], ['redes', 1], ['algo', 1]]);
        expect(subjectSubtree(forest, 'prod').map((node) => node.id)).toEqual(['prod']);
        expect(subjectSubtree(forest, 'es').map((node) => node.id)).toEqual(['es', 'gram', 'subj', 'voc']);
        expect(subjectSubtree(forest, 'unknown')).toEqual([]);
    });

    it('finds a subject in whatever trees are loaded', () => {
        const forest = forestOfTrees({ es, se, missing: undefined });
        expect(subjectSubtree(forest, 'impl').map((node) => node.id)).toEqual(['impl', 'testes']);
        expect(subjectSubtree(forest, 'gram')[0]).toMatchObject({ rootId: 'es', rootTitle: 'Espanhol C1' });
    });

    it('writes a nested subject with its root and a root as itself', () => {
        expect(subjectLabel({ title: 'Implementação 2.0', rootTitle: 'Software Engineer' })).toBe('Software Engineer › Implementação 2.0');
        expect(subjectLabel({ title: 'Espanhol C1', rootTitle: null })).toBe('Espanhol C1');
        expect(subjectLabel({ title: 'Espanhol C1' })).toBe('Espanhol C1');
    });
});
