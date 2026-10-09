import { describe, expect, it, vi } from 'vitest';
import { DocumentSync, type SaveAnswer, type ServerPage } from '../documentSync';
import type { DocBlock } from '../mergeDocuments';

const para = (id: string, text: string): DocBlock => ({ id, type: 'paragraph', content: [{ type: 'text', text }] });
const json = (blocks: DocBlock[]) => JSON.stringify(blocks);

/** A server with a page at a revision, and an editor holding a document, both in memory. */
function setup(serverDoc: DocBlock[], revision = 0) {
    const server = { doc: json(serverDoc), revision, saves: [] as { content: string; base: number }[] };
    let editorDoc = serverDoc;
    const statuses: string[] = [];
    const conflicts: unknown[] = [];
    const replaced: { blocks: DocBlock[]; save: boolean }[] = [];
    const sync = new DocumentSync({
        save: vi.fn(async (content: string, base: number): Promise<SaveAnswer> => {
            server.saves.push({ content, base });
            if (base !== server.revision) return { saved: false, conflict: true };
            server.doc = content;
            server.revision += 1;
            return { saved: true, revision: server.revision };
        }),
        fetchPage: vi.fn(async (): Promise<ServerPage> => ({ content: server.doc, contentRevision: server.revision })),
        editor: () => ({
            getDocument: () => editorDoc,
            replaceDocument: (blocks: DocBlock[], { save }: { save: boolean }) => {
                editorDoc = blocks;
                replaced.push({ blocks, save });
            },
        }),
        onStatus: (s) => statuses.push(s),
        onConflict: (r) => conflicts.push(r),
    });
    sync.ready(json(serverDoc), revision, false);
    return {
        sync, server, statuses, conflicts, replaced,
        type: (blocks: DocBlock[]) => { editorDoc = blocks; },
        editorDoc: () => editorDoc,
        /** Someone else saves the page. */
        elsewhere: (blocks: DocBlock[]) => { server.doc = json(blocks); server.revision += 1; },
    };
}

describe('DocumentSync', () => {
    it('saves from the revision it read and moves on to the one the server returns', async () => {
        const t = setup([para('a', 'Alpha')], 4);
        await t.sync.requestSave(json([para('a', 'Alpha 1')]));
        await t.sync.requestSave(json([para('a', 'Alpha 2')]));

        expect(t.server.saves.map((s) => s.base)).toEqual([4, 5]);
        expect(t.sync.revision).toBe(6);
    });

    it('merges what was saved elsewhere into the edit and saves the result, no question asked', async () => {
        const t = setup([para('a', 'Alpha'), para('b', 'Beta')]);
        t.elsewhere([para('a', 'Alpha'), para('b', 'Beta'), para('c', 'Appended by the assistant')]);
        const typed = [para('a', 'Alpha, typed here'), para('b', 'Beta')];
        t.type(typed);

        await t.sync.requestSave(json(typed));

        expect(t.conflicts).toEqual([]);
        expect(t.replaced).toHaveLength(1);
        expect(t.replaced[0].save).toBe(true);
        expect(t.editorDoc().map((b) => (b.content as { text: string }[])[0].text))
            .toEqual(['Alpha, typed here', 'Beta', 'Appended by the assistant']);
        // The merged document goes back with the server's revision.
        await t.sync.requestSave(json(t.editorDoc()));
        expect(t.server.saves.at(-1)?.base).toBe(1);
        expect(t.server.doc).toContain('Appended by the assistant');
        expect(t.server.doc).toContain('Alpha, typed here');
    });

    it('hands a block changed on both sides to the person and saves nothing until they choose', async () => {
        const t = setup([para('a', 'Alpha')]);
        t.elsewhere([para('a', 'Alpha from the computer')]);
        t.type([para('a', 'Alpha from the phone')]);

        await t.sync.requestSave(json([para('a', 'Alpha from the phone')]));
        await t.sync.requestSave(json([para('a', 'Alpha from the phone, more')]));

        expect(t.conflicts).toHaveLength(1);
        expect(t.server.saves).toHaveLength(1);

        await t.sync.resolve({ a: 'both' });
        expect(t.conflicts.at(-1)).toBeNull();
        expect(t.editorDoc()).toHaveLength(2);
        expect(t.replaced.at(-1)?.save).toBe(true);
    });

    it('takes a newer page from elsewhere silently when nothing was typed here', async () => {
        const t = setup([para('a', 'Alpha')], 2);
        await t.sync.serverChanged({ content: json([para('a', 'Alpha'), para('b', 'New')]), contentRevision: 3 });

        expect(t.replaced).toEqual([{ blocks: [para('a', 'Alpha'), para('b', 'New')], save: false }]);
        expect(t.sync.revision).toBe(3);
    });

    it('ignores a page that is not newer than what it has', async () => {
        const t = setup([para('a', 'Alpha')], 2);
        await t.sync.serverChanged({ content: json([para('a', 'Old')]), contentRevision: 2 });
        expect(t.replaced).toEqual([]);
    });

    it('sends one save at a time and the waiting one with the revision the first returned', async () => {
        const t = setup([para('a', 'Alpha')]);
        const first = t.sync.requestSave(json([para('a', 'A1')]));
        const second = t.sync.requestSave(json([para('a', 'A2')]));
        await Promise.all([first, second]);

        expect(t.server.saves.map((s) => s.base)).toEqual([0, 1]);
        expect(t.server.doc).toContain('A2');
        expect(t.conflicts).toEqual([]);
    });

    it('writes ids into content from before revisions the moment the page opens', async () => {
        const save = vi.fn(async (): Promise<SaveAnswer> => ({ saved: true, revision: 1 }));
        const sync = new DocumentSync({
            save, fetchPage: vi.fn(), editor: () => null, onStatus: () => {}, onConflict: () => {},
        });
        sync.ready(json([para('x', 'Has an id now')]), 0, true);
        await Promise.resolve();

        expect(save).toHaveBeenCalledWith(json([para('x', 'Has an id now')]), 0);
    });

    it('drops an answer that arrives after the page left the screen', async () => {
        let answer: (a: SaveAnswer) => void = () => {};
        const statuses: string[] = [];
        const sync = new DocumentSync({
            save: () => new Promise<SaveAnswer>((r) => { answer = r; }),
            fetchPage: vi.fn(), editor: () => null, onStatus: (s) => statuses.push(s), onConflict: () => {},
        });
        sync.ready('[]', 0, false);
        const pending = sync.requestSave('[]');
        sync.close();
        answer({ saved: true, revision: 1 });
        await pending;

        expect(statuses).toEqual(['saving']);
    });

    it('still sends the last edit when the page leaves the screen before the save', async () => {
        const t = setup([para('a', 'Alpha')]);
        t.sync.close();
        await t.sync.requestSave(json([para('a', 'Typed just before leaving')]));

        expect(t.server.doc).toContain('Typed just before leaving');
        expect(t.statuses).toEqual([]);
    });

    it('answers on screen again once reopened, as after a development remount', async () => {
        const t = setup([para('a', 'Alpha')]);
        t.sync.close();
        t.sync.open();
        await t.sync.requestSave(json([para('a', 'Alpha 1')]));

        expect(t.statuses).toEqual(['saving', 'saved']);
    });
});
