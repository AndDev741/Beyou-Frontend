import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { BlockNoteEditor } from "@blocknote/core";
import { parseDiagramProp } from "@beyou/state";
import { notebookSchema, type NotebookEditor } from "../../editor/schema";
import { renderWithProviders } from "../../../../test/test-utils";
import DiagramGeneratorDialog from "../DiagramGeneratorDialog";
import { insertDiagramAt } from "../insertDiagram";
import { lifecycle } from "./fixtures";

vi.mock("@beyou/api/notebook", () => ({ generateDiagram: vi.fn() }));
import { generateDiagram } from "@beyou/api/notebook";

/** A page where "/diagram" was typed on the empty second line, between two paragraphs. */
function pageWithSlashLine() {
    const editor = BlockNoteEditor.create({
        schema: notebookSchema,
        initialContent: [
            { type: "paragraph", content: "TCP and UDP" },
            { type: "paragraph" },
            { type: "paragraph", content: "IP address" },
        ] as never,
    }) as NotebookEditor;
    return { editor, anchorId: editor.document[1].id };
}

function open(onInsert: (spec: typeof lifecycle) => void) {
    return renderWithProviders(
        <DiagramGeneratorDialog isOpen onClose={vi.fn()} pageId="p1" pageTitle="Networks" onInsert={onInsert} />
    );
}

describe("DiagramGeneratorDialog", () => {
    test("asks for a diagram with the AI's pick of kind on the page's notes, shows it, and inserts it where the slash was", async () => {
        vi.mocked(generateDiagram).mockResolvedValue({ success: { diagram: { ...lifecycle, kind: "MAP" }, fromNotes: true } });
        const { editor, anchorId } = pageWithSlashLine();
        open((spec) => insertDiagramAt(editor, anchorId, spec));

        const dialog = screen.getByTestId("diagram-generator");
        expect(screen.getByTestId("diagram-prompt")).toHaveFocus();
        expect(screen.getByTestId("diagram-grounded")).toHaveAttribute("aria-checked", "true");
        expect(screen.getByTestId("diagram-kind-auto")).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByTestId("diagram-generate")).toBeDisabled();

        fireEvent.change(screen.getByTestId("diagram-prompt"), { target: { value: "TCP versus UDP" } });
        fireEvent.click(screen.getByTestId("diagram-generate"));

        await within(dialog).findByRole("img");
        expect(generateDiagram).toHaveBeenCalledWith("p1", { prompt: "TCP versus UDP", kind: null, grounded: true, base: null }, expect.any(Function));
        // Auto was picked, so the dialog says which kind the AI chose; the notes were read, so it says that too.
        expect(screen.getByTestId("diagram-picked")).toHaveTextContent("DiagramChosenByAi");
        expect(screen.getByTestId("diagram-from-notes")).toHaveTextContent("DiagramFromNotes");

        fireEvent.click(screen.getByTestId("diagram-insert"));

        // The empty slash line became the diagram; the paragraphs around it stay where they were.
        const types = editor.document.map((block) => block.type);
        expect(types.slice(0, 3)).toEqual(["paragraph", "diagram", "paragraph"]);
        const stored = parseDiagramProp((editor.document[1].props as { spec: string }).spec);
        expect(stored?.kind).toBe("MAP");
        expect(stored?.nodes.map((node) => node.label)).toEqual(["Active", "Committed", "Failed"]);
    });

    test("sends the chosen kind and the switch turned off, and draws again on demand", async () => {
        vi.mocked(generateDiagram).mockResolvedValue({ success: { diagram: lifecycle, fromNotes: false } });
        open(vi.fn());

        fireEvent.change(screen.getByTestId("diagram-prompt"), { target: { value: "Lifecycle" } });
        fireEvent.click(screen.getByTestId("diagram-kind-CYCLE"));
        fireEvent.click(screen.getByTestId("diagram-grounded"));
        fireEvent.click(screen.getByTestId("diagram-generate"));

        await screen.findByTestId("diagram-regenerate");
        expect(generateDiagram).toHaveBeenLastCalledWith("p1", { prompt: "Lifecycle", kind: "CYCLE", grounded: false, base: null }, expect.any(Function));
        // A kind the person chose is not "picked by the AI", and nothing came from the notes.
        expect(screen.queryByTestId("diagram-picked")).toBeNull();
        expect(screen.queryByTestId("diagram-from-notes")).toBeNull();

        fireEvent.click(screen.getByTestId("diagram-regenerate"));
        await waitFor(() => expect(generateDiagram).toHaveBeenCalledTimes(2));
        // The second answer settles before the test ends, so its update stays inside act.
        await waitFor(() => expect(screen.getByTestId("diagram-regenerate")).not.toBeDisabled());
    });

    test("an AI failure is shown and nothing can be inserted", async () => {
        vi.mocked(generateDiagram).mockResolvedValue({ error: { errorKey: "AI_UNAVAILABLE" } });
        open(vi.fn());

        fireEvent.change(screen.getByTestId("diagram-prompt"), { target: { value: "Anything" } });
        fireEvent.click(screen.getByTestId("diagram-generate"));

        await screen.findByText("AI_UNAVAILABLE");
        expect(screen.queryByTestId("diagram-insert")).toBeNull();
        expect(screen.getByTestId("diagram-generate")).not.toBeDisabled();
    });
});
