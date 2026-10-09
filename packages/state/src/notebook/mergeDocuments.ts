/**
 * Merging a page's document when two writers saved from the same revision: this editor, and
 * whoever saved first (another device, another tab, the assistant appending notes).
 *
 * A BlockNote document is a list of blocks, each with an id the editor gives it. Three versions
 * meet: `base`, the document as this editor last had it in step with the server; `mine`, what it
 * holds now; `theirs`, what the server holds now. Per block:
 *
 * - changed on one side only: that side's version;
 * - changed the same way on both: either;
 * - changed differently on both, or removed on one side and changed on the other: a conflict,
 *   which the person settles (keep mine, keep theirs, keep both);
 * - added on either side: kept, where its side put it.
 *
 * The order follows `theirs`, and blocks this editor added go after the block they followed here.
 *
 * Blocks the server writes (an append, the board block, an AI draft) carry no id and none of the
 * default props the editor fills in, so they are matched to `base` by type and text instead, in
 * order. The server only ever adds whole blocks, so such a block is never counted as edited.
 */
export type DocBlock = {
    id?: string;
    type?: string;
    props?: Record<string, unknown>;
    content?: unknown;
    children?: DocBlock[];
    [key: string]: unknown;
};

export type MergeConflict = {
    id: string;
    /** What this editor has now; null when it removed the block. */
    mine: DocBlock | null;
    /** What the other writer saved; null when they removed the block. */
    theirs: DocBlock | null;
};

export type ConflictChoice = 'mine' | 'theirs' | 'both';

/** A merged block, or the place a conflict sits until it is settled. */
type Slot = { block: DocBlock } | { conflict: MergeConflict };

export type MergeResult = {
    slots: Slot[];
    conflicts: MergeConflict[];
};

/**
 * Values the editor fills in when it loads a block written without them. The server writes
 * blocks bare, so a prop at its default and a missing prop are the same block.
 */
const DEFAULT_PROPS: Record<string, unknown> = {
    backgroundColor: 'default',
    textColor: 'default',
    textAlignment: 'left',
};

/**
 * The block with its ids, default props, empty styles and empty children taken out, keys
 * sorted: two blocks that read the same compare equal, whichever writer wrote them.
 */
function shape(block: DocBlock | undefined): string {
    const strip = (value: unknown, key?: string): unknown => {
        if (Array.isArray(value)) return value.map((v) => strip(v));
        if (value && typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value as Record<string, unknown>)
                    .filter(([k]) => k !== 'id')
                    .filter(([k, v]) => !(key === 'props' && DEFAULT_PROPS[k] === v))
                    .filter(([k, v]) => !((k === 'styles' || k === 'props') && isEmptyObject(v)))
                    .filter(([k, v]) => !(k === 'children' && Array.isArray(v) && v.length === 0))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, v]) => [k, strip(v, k)]),
            );
        }
        return value;
    };
    return JSON.stringify(strip(block ?? null));
}

function isEmptyObject(value: unknown): boolean {
    return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0;
}

/** The text in a block's inline content, links included. */
function plainText(content: unknown): string {
    return Array.isArray(content)
        ? content.map((part) => {
            if (part && typeof part === 'object') {
                const p = part as { text?: unknown; content?: unknown };
                return typeof p.text === 'string' ? p.text : plainText(p.content);
            }
            return '';
        }).join('')
        : '';
}

/** Type and plain text: how a block the server wrote (no id, no default props) is recognised. */
function looseKey(block: DocBlock): string {
    return JSON.stringify([block.type ?? '', plainText(block.content), (block.children ?? []).length]);
}

/** A copy with every id removed, so a kept second version gets fresh ids from the editor. */
function withoutIds(block: DocBlock): DocBlock {
    const { id: _id, children, ...rest } = block;
    return { ...rest, ...(children ? { children: children.map(withoutIds) } : {}) };
}

export function mergeDocuments(base: DocBlock[], mine: DocBlock[], theirs: DocBlock[]): MergeResult {
    const baseById = new Map(base.filter((b) => b.id).map((b) => [b.id as string, b]));
    const mineById = new Map(mine.filter((b) => b.id).map((b) => [b.id as string, b]));

    // Which base block each of theirs is, if any: by id, else (server-written) by type and text.
    const taken = new Set<string>();
    const theirsBase: (string | null)[] = theirs.map((t) => {
        if (t.id && baseById.has(t.id) && !taken.has(t.id)) {
            taken.add(t.id);
            return t.id;
        }
        if (!t.id) {
            const key = looseKey(t);
            const match = base.find((b) => b.id && !taken.has(b.id) && looseKey(b) === key);
            if (match?.id) {
                taken.add(match.id);
                return match.id;
            }
        }
        return null;
    });
    const theirsByBaseId = new Map<string, DocBlock>();
    theirs.forEach((t, i) => {
        const id = theirsBase[i];
        if (id) theirsByBaseId.set(id, t);
    });

    const conflicts: MergeConflict[] = [];
    /** What a block that `base` had becomes: a block, a conflict, or nothing. */
    const decide = (id: string): Slot | null => {
        const b = baseById.get(id)!;
        const m = mineById.get(id) ?? null;
        const t = theirsByBaseId.get(id) ?? null;
        // A server-written block was matched by its text: it is the base block, unchanged.
        const theirsChanged = t !== null && t.id !== undefined && shape(t) !== shape(b);
        const mineChanged = m !== null && shape(m) !== shape(b);
        if (m && t) {
            if (mineChanged && theirsChanged && shape(m) !== shape(t)) {
                const conflict = { id, mine: m, theirs: t };
                conflicts.push(conflict);
                return { conflict };
            }
            return { block: mineChanged ? m : theirsChanged ? t : m };
        }
        if (!m && t) {
            if (!theirsChanged) return null;
            const conflict = { id, mine: null, theirs: t };
            conflicts.push(conflict);
            return { conflict };
        }
        if (m && !t) {
            if (!mineChanged) return null;
            const conflict = { id, mine: m, theirs: null };
            conflicts.push(conflict);
            return { conflict };
        }
        return null;
    };

    // The skeleton is theirs, in their order.
    const slots: Slot[] = [];
    const placed = new Set<string>();
    theirs.forEach((t, i) => {
        const id = theirsBase[i];
        if (id === null) {
            slots.push({ block: t });
            if (t.id) placed.add(t.id);
            return;
        }
        placed.add(id);
        const slot = decide(id);
        if (slot) slots.push(slot);
    });

    // Then what this editor added, and what it changed that they removed, after the block it
    // followed here (or first, when it led the document).
    const slotId = (slot: Slot) => ('block' in slot ? slot.block.id : slot.conflict.id);
    mine.forEach((m, i) => {
        if (!m.id || placed.has(m.id)) return;
        let slot: Slot | null;
        if (baseById.has(m.id)) {
            placed.add(m.id);
            slot = decide(m.id);
        } else {
            slot = { block: m };
        }
        placed.add(m.id);
        if (!slot) return;
        let at = 0;
        for (let j = i - 1; j >= 0; j--) {
            const before = mine[j].id;
            const index = slots.findIndex((s) => slotId(s) === before);
            if (index >= 0) {
                at = index + 1;
                break;
            }
        }
        slots.splice(at, 0, slot);
    });

    return { slots, conflicts };
}

/**
 * The document once every conflict is settled. A conflict with no choice keeps both versions:
 * nothing anyone wrote is dropped without the person saying so.
 */
export function resolveMerge(result: MergeResult, choices: Record<string, ConflictChoice> = {}): DocBlock[] {
    return result.slots.flatMap((slot) => {
        if ('block' in slot) return [slot.block];
        const { id, mine, theirs } = slot.conflict;
        const choice = choices[id] ?? 'both';
        if (choice === 'mine') return mine ? [mine] : [];
        if (choice === 'theirs') return theirs ? [theirs] : [];
        if (mine && theirs) return [theirs, withoutIds(mine)];
        return [mine ?? theirs!];
    });
}

/** Whether two documents read the same, ids and default props aside. */
export function sameDocument(a: DocBlock[], b: DocBlock[]): boolean {
    return a.length === b.length && a.every((block, i) => shape(block) === shape(b[i]));
}

/** The same block in both: same id, and it reads the same. */
export function sameBlock(a: DocBlock, b: DocBlock): boolean {
    return a.id !== undefined && a.id === b.id && shape(a) === shape(b);
}

/** The plain text of a block, for showing a conflict to the person. */
export function blockPlainText(block: DocBlock | null): string {
    return block ? plainText(block.content) : '';
}
