import { mergeDocuments, resolveMerge, sameDocument, type ConflictChoice, type DocBlock, type MergeResult } from './mergeDocuments';

/**
 * Keeps one open editor's document in step with the server, for the web page screen and the
 * phone alike. No React and no network of its own: the caller passes how to save, how to read
 * the page, and the editor, whose methods may answer later (on the phone the editor runs in a
 * web view and every call crosses a bridge).
 *
 * The server holds a revision per page and refuses a save from an older one
 * (NOTEBOOK_CONTENT_CONFLICT). This keeps the revision the editor last saw and the document at
 * that revision, the base. When a save is refused, or the page arrives from elsewhere with a
 * newer revision (an assistant turn, a reload), it merges base, the editor's document and the
 * server's block by block. Changes on one side go in by themselves; a block changed on both
 * sides goes to the person.
 *
 * One save is in the air at a time. A save asked for meanwhile waits and goes with the
 * revision the first one returns, so two saves from the same editor never conflict with each
 * other.
 */
export type SaveAnswer = { saved: true; revision: number } | { saved: false; conflict: boolean };

export type ServerPage = { content: string | null; contentRevision: number };

export type SyncEditor = {
    getDocument: () => DocBlock[] | Promise<DocBlock[]>;
    replaceDocument: (blocks: DocBlock[], options: { save: boolean }) => void | Promise<void>;
};

export type SyncStatus = 'saving' | 'saved' | 'failed';

export type DocumentSyncDeps = {
    save: (content: string, baseRevision: number) => Promise<SaveAnswer>;
    fetchPage: () => Promise<ServerPage | null>;
    editor: () => SyncEditor | null;
    onStatus: (status: SyncStatus) => void;
    /** A merge that needs the person, or null once it is settled. */
    onConflict: (result: MergeResult | null) => void;
};

export function parseDocument(content: string | null | undefined): DocBlock[] {
    if (!content) return [];
    try {
        const blocks = JSON.parse(content);
        return Array.isArray(blocks) ? blocks : [];
    } catch {
        return [];
    }
}

export class DocumentSync {
    private base: { revision: number; document: DocBlock[] } | null = null;
    private inFlight = false;
    private queued: string | null = null;
    private pending: { result: MergeResult; theirs: DocBlock[] } | null = null;
    private closed = false;

    constructor(private readonly deps: DocumentSyncDeps) {}

    /** The editor holds the page: `document` is its version of the content at `revision`. */
    ready(document: string, revision: number, hadBlocksWithoutIds: boolean): void {
        this.base = { revision, document: parseDocument(document) };
        // Content from before revisions can hold blocks with no id, which a merge can only match
        // by text. Saving once writes the ids the editor gave them.
        if (hadBlocksWithoutIds) void this.requestSave(document);
    }

    /**
     * The page this editor showed is gone from the screen. Saves still go out (leaving a page
     * sends its last edit as the editor goes), but their answers no longer move the screen, and a
     * refused one is not merged: there is no editor left to merge into.
     */
    close(): void {
        this.closed = true;
    }

    /** The page is on screen (again: React's strict mode unmounts and remounts once in development). */
    open(): void {
        this.closed = false;
    }

    get revision(): number | null {
        return this.base?.revision ?? null;
    }

    async requestSave(json: string): Promise<void> {
        if (!this.base) return;
        if (this.inFlight || this.pending) {
            this.queued = json;
            return;
        }
        this.inFlight = true;
        if (!this.closed) this.deps.onStatus('saving');
        const answer = await this.deps.save(json, this.base.revision);
        this.inFlight = false;
        if (answer.saved) {
            this.base = { revision: answer.revision, document: parseDocument(json) };
        }
        if (this.closed) {
            const next = this.queued;
            this.queued = null;
            if (next && answer.saved) await this.requestSave(next);
            return;
        }
        if (answer.saved) {
            this.deps.onStatus('saved');
        } else if (answer.conflict) {
            // The merge reads the editor as it is now, queued edits included.
            this.queued = null;
            await this.catchUp();
            return;
        } else {
            this.deps.onStatus('failed');
        }
        const next = this.queued;
        this.queued = null;
        if (next) await this.requestSave(next);
    }

    /** The page as the server sent it, from anywhere: merged in when it is newer than the base. */
    async serverChanged(page: ServerPage): Promise<void> {
        if (this.closed || !this.base || page.contentRevision <= this.base.revision) return;
        await this.merge(page);
    }

    /** Settles the conflicts of the merge waiting on the person. */
    async resolve(choices: Record<string, ConflictChoice>): Promise<void> {
        const waiting = this.pending;
        if (!waiting || this.closed) return;
        this.pending = null;
        this.queued = null;
        this.deps.onConflict(null);
        await this.apply(resolveMerge(waiting.result, choices), waiting.theirs);
    }

    private async catchUp(): Promise<void> {
        const page = await this.deps.fetchPage();
        if (this.closed) return;
        if (!page) {
            this.deps.onStatus('failed');
            return;
        }
        await this.merge(page);
    }

    private async merge(page: ServerPage): Promise<void> {
        const editor = this.deps.editor();
        if (!editor || !this.base) return;
        const mine = await editor.getDocument();
        const theirs = parseDocument(page.content);
        const result = mergeDocuments(this.base.document, mine, theirs);
        this.base = { revision: page.contentRevision, document: theirs };
        if (result.conflicts.length > 0) {
            this.pending = { result, theirs };
            this.deps.onConflict(result);
            return;
        }
        await this.apply(resolveMerge(result), theirs, mine);
    }

    /**
     * Puts the merged document in the editor. It is saved when it holds something the server
     * does not (this editor's changes), and swapped in silently when it is just the server's.
     */
    private async apply(merged: DocBlock[], theirs: DocBlock[], mine?: DocBlock[]): Promise<void> {
        const editor = this.deps.editor();
        if (!editor || this.closed) return;
        const current = mine ?? (await editor.getDocument());
        const needsSave = !sameDocument(merged, theirs);
        if (!sameDocument(merged, current)) {
            await editor.replaceDocument(merged, { save: needsSave });
        } else if (needsSave) {
            await this.requestSave(JSON.stringify(current));
        }
        if (!needsSave) this.deps.onStatus('saved');
    }
}
