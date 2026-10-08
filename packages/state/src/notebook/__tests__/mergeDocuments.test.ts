import { describe, expect, it } from 'vitest';
import { blockPlainText, mergeDocuments, resolveMerge, type DocBlock } from '../mergeDocuments';

/** A paragraph as the editor holds it: id, filled-in props, styled text. */
const para = (id: string, text: string): DocBlock => ({
    id,
    type: 'paragraph',
    props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
    content: [{ type: 'text', text, styles: {} }],
    children: [],
});
/** The same paragraph as the server writes it: no id, no default props. */
const serverPara = (text: string): DocBlock => ({ type: 'paragraph', content: [{ type: 'text', text, styles: {} }] });
const texts = (blocks: DocBlock[]) => blocks.map((b) => blockPlainText(b) || b.type);

describe('mergeDocuments', () => {
    const base = [para('a', 'Alpha'), para('b', 'Beta'), para('c', 'Gamma')];

    it('takes each side where only that side changed a block', () => {
        const mine = [para('a', 'Alpha, edited here'), para('b', 'Beta'), para('c', 'Gamma')];
        const theirs = [para('a', 'Alpha'), para('b', 'Beta'), para('c', 'Gamma, edited there')];

        const result = mergeDocuments(base, mine, theirs);

        expect(result.conflicts).toEqual([]);
        expect(texts(resolveMerge(result))).toEqual(['Alpha, edited here', 'Beta', 'Gamma, edited there']);
    });

    it('asks only when the same block changed differently on both sides, and keeps both by default', () => {
        const mine = [para('a', 'Alpha'), para('b', 'Beta from the phone'), para('c', 'Gamma')];
        const theirs = [para('a', 'Alpha'), para('b', 'Beta from the computer'), para('c', 'Gamma')];

        const result = mergeDocuments(base, mine, theirs);

        expect(result.conflicts.map((c) => c.id)).toEqual(['b']);
        expect(texts(resolveMerge(result, { b: 'mine' }))).toEqual(['Alpha', 'Beta from the phone', 'Gamma']);
        expect(texts(resolveMerge(result, { b: 'theirs' }))).toEqual(['Alpha', 'Beta from the computer', 'Gamma']);
        const both = resolveMerge(result);
        expect(texts(both)).toEqual(['Alpha', 'Beta from the computer', 'Beta from the phone', 'Gamma']);
        // The second copy gets fresh ids from the editor rather than a duplicate of the first.
        expect(both[2].id).toBeUndefined();
    });

    it('does not ask when both sides made the same change', () => {
        const same = [para('a', 'Alpha'), para('b', 'Beta, same edit'), para('c', 'Gamma')];
        expect(mergeDocuments(base, same, same).conflicts).toEqual([]);
    });

    it("keeps notes the server appended while this editor's edit is kept too", () => {
        // The page was opened from a server-written document, so the server still has no ids and
        // none of the props the editor filled in.
        const mine = [para('a', 'Alpha'), para('b', 'Beta, typed here'), para('c', 'Gamma')];
        const theirs = [serverPara('Alpha'), serverPara('Beta'), serverPara('Gamma'), serverPara('Appended by the assistant')];

        const result = mergeDocuments(base, mine, theirs);

        expect(result.conflicts).toEqual([]);
        expect(texts(resolveMerge(result))).toEqual(['Alpha', 'Beta, typed here', 'Gamma', 'Appended by the assistant']);
    });

    it('puts a block added here after the block it followed, among the blocks added there', () => {
        const mine = [para('a', 'Alpha'), para('n', 'New here'), para('b', 'Beta'), para('c', 'Gamma')];
        const theirs = [para('x', 'New there'), para('a', 'Alpha'), para('b', 'Beta'), para('c', 'Gamma')];

        expect(texts(resolveMerge(mergeDocuments(base, mine, theirs)))).toEqual(['New there', 'Alpha', 'New here', 'Beta', 'Gamma']);
    });

    it('removes what one side removed and the other left alone', () => {
        const mine = [para('a', 'Alpha'), para('c', 'Gamma')];
        const theirs = [para('a', 'Alpha'), para('b', 'Beta')];

        expect(texts(resolveMerge(mergeDocuments(base, mine, theirs)))).toEqual(['Alpha']);
    });

    it('asks when one side removed a block the other changed', () => {
        const mine = [para('a', 'Alpha'), para('b', 'Beta, still needed'), para('c', 'Gamma')];
        const theirs = [para('a', 'Alpha'), para('c', 'Gamma')];

        const result = mergeDocuments(base, mine, theirs);

        expect(result.conflicts).toEqual([{ id: 'b', mine: mine[1], theirs: null }]);
        expect(texts(resolveMerge(result, { b: 'theirs' }))).toEqual(['Alpha', 'Gamma']);
        expect(texts(resolveMerge(result))).toEqual(['Alpha', 'Beta, still needed', 'Gamma']);
    });

    it('matches server-written blocks in order, so two equal paragraphs are not merged into one', () => {
        const twins = [para('a', 'Same'), para('b', 'Same')];
        const mine = [para('a', 'Same'), para('b', 'Same, edited')];
        const theirs = [serverPara('Same'), serverPara('Same')];

        expect(texts(resolveMerge(mergeDocuments(twins, mine, theirs)))).toEqual(['Same', 'Same, edited']);
    });

    it('counts a block the server wrote with an id but no props as the same block the editor filled in', () => {
        const mine = [para('a', 'Alpha'), para('b', 'Beta'), para('c', 'Gamma, edited here')];
        const theirs = [
            { id: 'a', type: 'paragraph', content: [{ type: 'text', text: 'Alpha' }] },
            para('b', 'Beta'),
            para('c', 'Gamma'),
        ];

        const result = mergeDocuments(base, mine, theirs);

        expect(result.conflicts).toEqual([]);
        expect(texts(resolveMerge(result))).toEqual(['Alpha', 'Beta', 'Gamma, edited here']);
    });
});
