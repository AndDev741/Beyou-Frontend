import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../../../test/test-utils";
import { block, cycle, makeStore, notebookHome, softwareEngineer, topic, tree, treeItem, treesById } from "./fixtures";

vi.mock("@beyou/api/notebook", () => ({
    getNotebookHome: vi.fn(),
    getTopicTree: vi.fn(),
    updateStudyBlock: vi.fn(),
}));

import { getNotebookHome, getTopicTree, updateStudyBlock } from "@beyou/api/notebook";
import BlockDialog from "../BlockDialog";

const trt = cycle();
const crase = block("b8", "port", 8, { plannedMinutes: 70, note: "Lista antiga" });

const portugues = tree("port", "Português", [
    treeItem("crase", "port", 0, { title: "Crase" }),
    // Linked in from another topic: a block may not point at it, so it is not offered.
    treeItem("elsewhere", "port", 1, { title: "Linked page", linked: true }),
]);

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getNotebookHome).mockResolvedValue({
        success: notebookHome([{ id: "port", title: "Português" }, { id: "se", title: "Software Engineer" }]),
    });
    vi.mocked(getTopicTree).mockImplementation(treesById(portugues, softwareEngineer));
});

describe("BlockDialog", () => {
    test("turns a time block into a concept on a page it picks, and sends every field", async () => {
        const saved = cycle({ name: "after" });
        vi.mocked(updateStudyBlock).mockResolvedValue({ success: saved });
        const onSaved = vi.fn();
        const onClose = vi.fn();
        renderWithProviders(<BlockDialog cycle={trt} block={crase} onClose={onClose} onSaved={onSaved} />, { storeOverride: makeStore() });

        fireEvent.click(screen.getByTestId("block-mode-GOAL"));
        fireEvent.click(screen.getByTestId("block-source-PAGE"));
        // A concept from a page needs the page before it can be saved.
        expect(screen.getByTestId("block-save")).toBeDisabled();

        await screen.findByRole("option", { name: /Crase/ });
        expect(screen.queryByRole("option", { name: /Linked page/ })).not.toBeInTheDocument();
        fireEvent.change(screen.getByTestId("block-page"), { target: { value: "crase" } });
        fireEvent.change(screen.getByTestId("block-minutes"), { target: { value: "50" } });
        fireEvent.click(screen.getByTestId("block-quiz"));
        fireEvent.change(screen.getByTestId("block-note"), { target: { value: "  " } });
        fireEvent.click(screen.getByTestId("block-save"));

        await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
        expect(updateStudyBlock).toHaveBeenCalledWith(
            "trt",
            "b8",
            { mode: "GOAL", plannedMinutes: 50, goalSource: "PAGE", pageId: "crase", requireQuiz: true, note: null },
            expect.any(Function),
        );
        expect(onClose).toHaveBeenCalled();
    });

    test("a concept that follows the roadmap drops any page it had", async () => {
        vi.mocked(updateStudyBlock).mockResolvedValue({ success: trt });
        const onSaved = vi.fn();
        const pinned = block("b8", "port", 8, { mode: "GOAL", goalSource: "PAGE", page: { id: "crase", title: "Crase", icon: null }, requireQuiz: true });
        renderWithProviders(<BlockDialog cycle={trt} block={pinned} onClose={() => {}} onSaved={onSaved} />, { storeOverride: makeStore() });

        fireEvent.click(screen.getByTestId("block-source-NEXT"));
        fireEvent.click(screen.getByTestId("block-save"));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(vi.mocked(updateStudyBlock).mock.calls[0][2]).toMatchObject({ goalSource: "NEXT", pageId: null, requireQuiz: true });
    });

    test("offers only the pages inside a nested subject, the subject first", async () => {
        const fundamentos = block("b3", "fund", 3, { topic: topic("fund", "Fundamentos da Computação", "Software Engineer") });
        renderWithProviders(<BlockDialog cycle={trt} block={fundamentos} onClose={() => {}} onSaved={() => {}} />, { storeOverride: makeStore() });

        fireEvent.click(screen.getByTestId("block-mode-GOAL"));
        fireEvent.click(screen.getByTestId("block-source-PAGE"));

        await screen.findByRole("option", { name: /Redes/ });
        const offered = [...screen.getByTestId("block-page").querySelectorAll("option")].map((option) => option.value);
        // The subject, then its own page; its siblings and the root stay out.
        expect(offered).toEqual(["", "fund", "redes"]);
    });

    test("refuses minutes outside 5 to 600", () => {
        renderWithProviders(<BlockDialog cycle={trt} block={crase} onClose={() => {}} onSaved={() => {}} />, { storeOverride: makeStore() });

        fireEvent.change(screen.getByTestId("block-minutes"), { target: { value: "3" } });
        expect(screen.getByTestId("block-save")).toBeDisabled();
        fireEvent.change(screen.getByTestId("block-minutes"), { target: { value: "601" } });
        expect(screen.getByTestId("block-save")).toBeDisabled();
    });

    test("keeps the dialog open and shows the server's refusal", async () => {
        vi.mocked(updateStudyBlock).mockResolvedValue({ error: { errorKey: "STUDY_CYCLE_NOT_FOUND" } });
        const onClose = vi.fn();
        renderWithProviders(<BlockDialog cycle={trt} block={crase} onClose={onClose} onSaved={() => {}} />, { storeOverride: makeStore() });

        fireEvent.click(screen.getByTestId("block-save"));

        expect(await screen.findByText(/STUDY_CYCLE_NOT_FOUND/)).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });
});
