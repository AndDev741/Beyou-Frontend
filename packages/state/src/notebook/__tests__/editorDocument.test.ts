import { describe, expect, it } from 'vitest';
import { documentPatch, hasBlockWithoutId, initialBlocks, isEmptyDocument } from '../editorDocument';
import type { DocBlock } from '../mergeDocuments';

const paragraph = (text?: string) => ({
    type: 'paragraph',
    content: text ? [{ type: 'text', text, styles: {} }] : [],
    children: [],
});

describe('isEmptyDocument', () => {
    it('is true for what a page nobody has written in holds', () => {
        expect(isEmptyDocument([paragraph()])).toBe(true);
        expect(isEmptyDocument([paragraph(), paragraph()])).toBe(true);
        expect(isEmptyDocument([])).toBe(true);
    });

    it('is false the moment there is a word, a block of another kind, or a nested one', () => {
        expect(isEmptyDocument([paragraph('Notes')])).toBe(false);
        expect(isEmptyDocument([{ type: 'flashcards', children: [] }, paragraph()])).toBe(false);
        expect(isEmptyDocument([{ type: 'heading', content: [], children: [] }])).toBe(false);
        expect(isEmptyDocument([{ ...paragraph(), children: [paragraph('inside')] }])).toBe(false);
    });
});

const block = (id: string, text: string): DocBlock => ({ id, type: 'paragraph', content: [{ type: 'text', text, styles: {} }], children: [] });

describe('documentPatch', () => {
    const current = [block('a', 'Alpha'), block('b', 'Beta'), block('c', 'Gamma')];

    it('swaps only the stretch that differs', () => {
        const patch = documentPatch(current, [block('a', 'Alpha'), block('b', 'Beta, edited'), block('c', 'Gamma')]);

        expect(patch.start).toBe(1);
        expect(patch.removed.map((b) => b.id)).toEqual(['b']);
        expect(patch.added.map((b) => b.id)).toEqual(['b']);
    });

    it('inserts without removing when the new document only adds', () => {
        const patch = documentPatch(current, [block('a', 'Alpha'), block('x', 'New'), block('b', 'Beta'), block('c', 'Gamma')]);

        expect(patch).toEqual({ start: 1, removed: [], added: [block('x', 'New')] });
    });

    it('removes without adding when the new document only drops', () => {
        const patch = documentPatch(current, [block('a', 'Alpha'), block('c', 'Gamma')]);

        expect(patch).toEqual({ start: 1, removed: [block('b', 'Beta')], added: [] });
    });

    it('touches nothing when the two read the same', () => {
        expect(documentPatch(current, current)).toEqual({ start: 3, removed: [], added: [] });
    });
});

describe('initialBlocks', () => {
    it('reads stored JSON and moves code blocks to a language the picker lists', () => {
        const stored = JSON.stringify([{ type: 'codeBlock', props: { language: 'py' }, content: [] }]);

        expect(initialBlocks(stored)).toEqual([{ type: 'codeBlock', props: { language: 'python' }, content: [] }]);
    });

    it('starts empty from nothing, an empty list or something unreadable', () => {
        expect(initialBlocks(null)).toBeUndefined();
        expect(initialBlocks('[]')).toBeUndefined();
        expect(initialBlocks('{not json')).toBeUndefined();
    });
});

describe('hasBlockWithoutId', () => {
    it('looks into nested blocks too', () => {
        expect(hasBlockWithoutId([block('a', 'Alpha')])).toBe(false);
        expect(hasBlockWithoutId([{ ...block('a', 'Alpha'), children: [{ type: 'paragraph' }] }])).toBe(true);
    });
});
