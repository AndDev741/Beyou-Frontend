import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { DiagramSpec } from "@beyou/types/notebook/diagram";
import { renderWithProviders } from "../../../../test/test-utils";
import DiagramEditorDialog from "../DiagramEditorDialog";
import { lifecycle } from "./fixtures";

vi.mock("@beyou/api/notebook", () => ({ generateDiagram: vi.fn() }));
import { generateDiagram } from "@beyou/api/notebook";

function open(spec: DiagramSpec = lifecycle, props: { focusInstruction?: boolean } = {}) {
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<DiagramEditorDialog isOpen onClose={onClose} spec={spec} pageId="p1" onSave={onSave} {...props} />);
    return { onSave, onClose, dialog: screen.getByTestId("diagram-editor") };
}

describe("DiagramEditorDialog", () => {
    test("a label edited by hand is redrawn at once and saved as a clean spec", () => {
        const { onSave, onClose, dialog } = open();

        fireEvent.change(screen.getByTestId("diagram-box-label-0"), { target: { value: "Running" } });
        expect(within(dialog).getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("Running → Committed"));

        fireEvent.change(screen.getByTestId("diagram-title"), { target: { value: "  States  " } });
        fireEvent.click(screen.getByTestId("diagram-save"));

        const saved = onSave.mock.calls[0][0] as DiagramSpec;
        expect(saved.title).toBe("States");
        expect(saved.nodes.map((node) => node.label)).toEqual(["Running", "Committed", "Failed"]);
        expect(saved.links).toHaveLength(2);
        expect(onClose).toHaveBeenCalled();
    });

    test("tones are radio buttons; a removed box takes its links with it", () => {
        const { onSave } = open();

        const group = screen.getAllByRole("radiogroup", { name: "DiagramBoxTone" })[0];
        expect(within(group).getAllByRole("radio")).toHaveLength(5);
        fireEvent.click(screen.getAllByRole("radio", { name: "DiagramToneWARNING" })[1]);
        fireEvent.click(screen.getByTestId("diagram-box-remove-2"));
        fireEvent.click(screen.getByTestId("diagram-save"));

        const saved = onSave.mock.calls[0][0] as DiagramSpec;
        expect(saved.nodes.map((node) => [node.label, node.tone])).toEqual([["Active", "ACCENT"], ["Committed", "WARNING"]]);
        expect(saved.links).toEqual([{ from: "a", to: "b", label: "commit", dashed: false }]);
    });

    test("fewer than two boxes cannot be saved", () => {
        const { onSave } = open();

        fireEvent.click(screen.getByTestId("diagram-box-remove-2"));
        fireEvent.click(screen.getByTestId("diagram-box-remove-1"));

        expect(screen.getByTestId("diagram-too-few")).toHaveTextContent("DiagramTooFewBoxes");
        expect(screen.getByTestId("diagram-save")).toBeDisabled();
        fireEvent.click(screen.getByTestId("diagram-add-box"));
        fireEvent.change(screen.getByTestId("diagram-box-label-1"), { target: { value: "Back" } });
        expect(screen.getByTestId("diagram-save")).not.toBeDisabled();
        expect(onSave).not.toHaveBeenCalled();
    });

    /** Layers and timelines ignore links, so the list goes; switching back finds them where they were. */
    test("links are listed only for kinds that draw them, and survive a switch", () => {
        const { onSave } = open();
        expect(screen.getAllByTestId("diagram-link-row")).toHaveLength(2);

        fireEvent.change(screen.getByTestId("diagram-editor-kind"), { target: { value: "LAYERS" } });
        expect(screen.queryByTestId("diagram-link-row")).toBeNull();
        expect(screen.queryByTestId("diagram-add-link")).toBeNull();

        fireEvent.change(screen.getByTestId("diagram-editor-kind"), { target: { value: "FLOW" } });
        fireEvent.click(screen.getByTestId("diagram-add-link"));
        expect(screen.getAllByTestId("diagram-link-row")).toHaveLength(3);
        fireEvent.change(screen.getByTestId("diagram-link-label-2"), { target: { value: "retry" } });
        fireEvent.change(screen.getByTestId("diagram-link-from-2"), { target: { value: "c" } });
        fireEvent.change(screen.getByTestId("diagram-link-to-2"), { target: { value: "a" } });
        fireEvent.click(screen.getByTestId("diagram-save"));

        expect((onSave.mock.calls[0][0] as DiagramSpec).links[2]).toEqual({ from: "c", to: "a", label: "retry", dashed: false });
    });

    test("Adjust with AI sends the current diagram as the base and shows the answer for review", async () => {
        vi.mocked(generateDiagram).mockResolvedValue({
            success: { diagram: { ...lifecycle, nodes: [...lifecycle.nodes, { id: "d", label: "Review", detail: null, tone: "NEUTRAL" }] }, fromNotes: true },
        });
        const { onSave } = open(lifecycle, { focusInstruction: true });
        expect(screen.getByTestId("diagram-instruction")).toHaveFocus();

        fireEvent.change(screen.getByTestId("diagram-instruction"), { target: { value: "Add a review step" } });
        fireEvent.click(screen.getByTestId("diagram-apply"));

        await waitFor(() => expect(screen.getByTestId("diagram-box-label-3")).toHaveValue("Review"));
        expect(generateDiagram).toHaveBeenCalledWith("p1", { prompt: "Add a review step", kind: "FLOW", grounded: true, base: lifecycle }, expect.any(Function));
        // Nothing is saved until the person says so.
        expect(onSave).not.toHaveBeenCalled();
    });
});
