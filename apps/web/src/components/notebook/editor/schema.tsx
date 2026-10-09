import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { BOARD_BLOCK_TYPE } from "@beyou/types/notebook/notebook";
import { CODE_LANGUAGES } from "@beyou/state";
import BoardBlock from "../board/BoardBlock";
import FlashcardsBlock from "./FlashcardsBlock";
import { useNotebookPageContext } from "./NotebookPageContext";

/** Renders the page's board where the block sits. The board itself belongs to the page. */
const RoadmapBoardSpec = createReactBlockSpec(
    { type: BOARD_BLOCK_TYPE, propSchema: {}, content: "none" },
    {
        render: function RoadmapBoardRender() {
            const { pageId } = useNotebookPageContext();
            return <BoardBlock pageId={pageId} />;
        },
    }
);

/** The page's flashcards, written and drafted where the block sits. */
const FlashcardsSpec = createReactBlockSpec(
    { type: "flashcards", propSchema: {}, content: "none" },
    {
        render: function FlashcardsRender() {
            const { pageId, cardsTotal } = useNotebookPageContext();
            return <FlashcardsBlock pageId={pageId} cardsTotal={cardsTotal} />;
        },
    }
);

// Audio, video and file blocks are left out: they need an upload backend the notebook does not
// have, and a block that offers an upload and then fails is worse than no block. Images stay,
// embedded by link.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { audio, video, file, ...kept } = defaultBlockSpecs;

export const notebookSchema = BlockNoteSchema.create({
    blockSpecs: {
        ...kept,
        // A language picker on every code block, over the list in @beyou/state's codeLanguages.ts.
        codeBlock: createCodeBlockSpec({ supportedLanguages: CODE_LANGUAGES, defaultLanguage: "text" }),
        [BOARD_BLOCK_TYPE]: RoadmapBoardSpec(),
        flashcards: FlashcardsSpec(),
    },
});

export type NotebookEditor = typeof notebookSchema.BlockNoteEditor;
export type NotebookBlock = typeof notebookSchema.Block;
