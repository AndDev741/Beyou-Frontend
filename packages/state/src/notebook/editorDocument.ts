import { withKnownLanguages } from './codeLanguages';
import { sameBlock, type DocBlock } from './mergeDocuments';

/**
 * What both notebook editors (BlockNote on the web, BlockNote in the phone's web view) do with a
 * document outside BlockNote itself, so the two read and write pages the same way.
 */

/**
 * Nothing but empty paragraphs: what BlockNote holds for a page nobody has written in. The editor
 * offers its "add a board" and "add cards" starters only while this is true.
 */
export function isEmptyDocument(blocks: readonly unknown[]): boolean {
    return blocks.every((block) => {
        const { type, content, children } = block as { type?: string; content?: unknown; children?: unknown[] };
        return type === 'paragraph' && (!Array.isArray(content) || content.length === 0) && (children?.length ?? 0) === 0;
    });
}

/** The stored JSON as an editor's initial content; anything unreadable starts the page empty. */
export function initialBlocks(content: string | null | undefined): DocBlock[] | undefined {
    if (!content) return undefined;
    try {
        const blocks = JSON.parse(content);
        return Array.isArray(blocks) && blocks.length > 0 ? withKnownLanguages(blocks) : undefined;
    } catch {
        return undefined;
    }
}

/** Whether any block, at any depth, came without an id. */
export function hasBlockWithoutId(blocks: readonly { id?: unknown; children?: unknown }[]): boolean {
    return blocks.some((block) =>
        !block.id || (Array.isArray(block.children) && hasBlockWithoutId(block.children as { id?: unknown }[])));
}

/**
 * How to turn `current` into `next` touching as little as possible: the blocks before and after
 * the stretch that differs read the same and stay, so a board or a cards block outside it is not
 * rebuilt and a cursor in a paragraph nobody else touched stays put.
 *
 * `removed` are blocks of `current` to take out, `added` blocks of `next` to put in their place,
 * after `current[start - 1]` when `start` is above zero and before `current[0]` otherwise.
 */
export type DocumentPatch = { start: number; removed: DocBlock[]; added: DocBlock[] };

export function documentPatch(current: readonly DocBlock[], next: readonly DocBlock[]): DocumentPatch {
    let start = 0;
    while (start < current.length && start < next.length && sameBlock(current[start], next[start])) start++;
    let end = 0;
    while (end < current.length - start && end < next.length - start
        && sameBlock(current[current.length - 1 - end], next[next.length - 1 - end])) end++;
    return {
        start,
        removed: current.slice(start, current.length - end),
        added: next.slice(start, next.length - end),
    };
}
