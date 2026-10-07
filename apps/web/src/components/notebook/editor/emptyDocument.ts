/**
 * Nothing but empty paragraphs: what BlockNote holds for a page nobody has written in. The editor
 * offers its "add a board" and "add cards" starters only while this is true.
 */
export function isEmptyDocument(blocks: readonly unknown[]): boolean {
    return blocks.every((block) => {
        const { type, content, children } = block as { type?: string; content?: unknown; children?: unknown[] };
        return type === "paragraph" && (!Array.isArray(content) || content.length === 0) && (children?.length ?? 0) === 0;
    });
}
