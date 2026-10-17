import type { DiagramSpec } from "@beyou/types/notebook/diagram";
import { newDiagramBlock } from "@beyou/state";
import type { NotebookBlock, NotebookEditor } from "../editor/schema";

const isBlankText = (block: NotebookBlock): boolean => {
    const content = (block as { content?: unknown }).content;
    if (!Array.isArray(content)) return false;
    return content.every((part: { text?: string }) => !(part?.text ?? "").trim());
};

/**
 * Puts a diagram block into the document: where `anchorId` is (the block "/diagram" was typed
 * in) or, with no anchor or one deleted meanwhile, at the end. An empty line becomes the diagram,
 * so neither the slash nor the editor's trailing line leaves a blank paragraph behind; a line
 * with text stays and the diagram goes after it. It goes through the editor, so autosave writes
 * it with the page.
 */
export function insertDiagramAt(editor: NotebookEditor, anchorId: string | null, spec: DiagramSpec): void {
    const block = newDiagramBlock(spec);
    const blocks = editor.document;
    const target = (anchorId ? editor.getBlock(anchorId) : undefined) ?? blocks[blocks.length - 1];
    if (isBlankText(target as NotebookBlock)) editor.updateBlock(target, block);
    else editor.insertBlocks([block], target, "after");
}
