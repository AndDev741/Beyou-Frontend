import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { parseDiagramProp, serializeDiagram } from "@beyou/state";
import { notebookSchema, type NotebookEditor } from "../../editor/schema";
import { NotebookPageContext } from "../../editor/NotebookPageContext";
import { renderWithProviders } from "../../../../test/test-utils";
import { lifecycle } from "./fixtures";

vi.mock("@beyou/api/notebook", () => ({ generateDiagram: vi.fn() }));

/** A real editor holding a paragraph and a stored diagram block, as a saved page would. */
function mountPage(spec: string = serializeDiagram(lifecycle)) {
    const editor = BlockNoteEditor.create({
        schema: notebookSchema,
        initialContent: [{ type: "paragraph", content: "Intro" }, { type: "diagram", props: { spec } }] as never,
    }) as NotebookEditor;
    renderWithProviders(
        <NotebookPageContext.Provider value={{ pageId: "p1", pageTitle: "Transactions", cardsTotal: 0 }}>
            <BlockNoteView editor={editor} />
        </NotebookPageContext.Provider>
    );
    const storedSpec = () => parseDiagramProp((editor.document[1].props as { spec: string }).spec);
    return { editor, storedSpec };
}

describe("diagram block", () => {
    test("draws the diagram stored in the block's prop, with its title and kind", async () => {
        mountPage();

        const block = await screen.findByTestId("diagram-block");
        expect(within(block).getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("Active → Committed"));
        expect(block).toHaveTextContent("Transaction lifecycle");
        expect(within(block).getByTestId("diagram-toolbar")).toBeInTheDocument();
    });

    test("a stored prop that does not parse shows the could-not-draw box and no toolbar", async () => {
        mountPage("{not json");

        const block = await screen.findByTestId("diagram-block");
        expect(within(block).getByTestId("diagram-invalid")).toBeInTheDocument();
        expect(within(block).queryByTestId("diagram-toolbar")).toBeNull();
    });

    /** The kind switch redraws the same boxes and writes the change into the block, where autosave sees it. */
    test("switching the kind writes the new kind into the block and keeps the boxes", async () => {
        const { storedSpec } = mountPage();

        fireEvent.click(await screen.findByTestId("diagram-kind-switch"));
        fireEvent.click(screen.getByTestId("diagram-kind-option-MAP"));

        await waitFor(() => expect(storedSpec()?.kind).toBe("MAP"));
        expect(storedSpec()?.nodes.map((n) => n.label)).toEqual(["Active", "Committed", "Failed"]);
    });

    /** A sequence holds six participants; a switch that would drop boxes is not offered. */
    test("a kind that would drop boxes is disabled", async () => {
        const many = { ...lifecycle, nodes: Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, label: `Step ${i}`, detail: null, tone: "NEUTRAL" as const })), links: [] };
        mountPage(serializeDiagram(many));

        fireEvent.click(await screen.findByTestId("diagram-kind-switch"));
        expect(screen.getByTestId("diagram-kind-option-SEQUENCE")).toBeDisabled();
        expect(screen.getByTestId("diagram-kind-option-CYCLE")).not.toBeDisabled();
    });

    test("Edit opens the editor, and saving writes the edited diagram into the block", async () => {
        const { storedSpec } = mountPage();

        fireEvent.click(await screen.findByTestId("diagram-edit"));
        const dialog = await screen.findByTestId("diagram-editor");
        fireEvent.change(within(dialog).getByTestId("diagram-box-label-1"), { target: { value: "Durable" } });
        fireEvent.click(within(dialog).getByTestId("diagram-save"));

        await waitFor(() => expect(storedSpec()?.nodes[1].label).toBe("Durable"));
        expect(screen.queryByTestId("diagram-editor")).toBeNull();
    });

    test("full screen opens the diagram in a dialog that Escape closes", async () => {
        mountPage();

        fireEvent.click(await screen.findByTestId("diagram-fullscreen"));
        const viewer = await screen.findByTestId("diagram-fullscreen-view");
        expect(within(viewer).getByRole("img")).toBeInTheDocument();

        fireEvent.keyDown(viewer, { key: "Escape" });
        await waitFor(() => expect(screen.queryByTestId("diagram-fullscreen-view")).toBeNull());
    });
});
