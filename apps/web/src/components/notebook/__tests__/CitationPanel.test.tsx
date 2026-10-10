import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { Citation } from "@beyou/types/notebook/notebook";
import { renderWithProviders } from "../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({ getPassage: vi.fn() }));

import CitationPanel from "../CitationPanel";

const citation: Citation = {
    n: 1, kind: "SOURCE", sourceId: "s1", chunkId: "c1", pageId: null,
    title: "CLRS", pageNumber: 296, excerpt: "The successor has no left child.",
};

describe("CitationPanel", () => {
    /**
     * It sits inline under an answer and blocks nothing, so it is a region. As a `dialog` it made
     * the study room treat it as a modal and ignore Escape, while it had no Escape of its own.
     */
    test("is a labelled region, not a dialog", () => {
        renderWithProviders(<CitationPanel citation={citation} onClose={vi.fn()} />);

        expect(screen.getByRole("region", { name: "NotebookCitationTitle" })).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    test("Escape closes it", () => {
        const onClose = vi.fn();
        renderWithProviders(<CitationPanel citation={citation} onClose={onClose} />);

        fireEvent.keyDown(window, { key: "Escape" });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    /** The study room leaves on Escape unless a layer like this one is open; this is what it looks for. */
    test("marks itself as the layer that owns Escape while it is open", () => {
        renderWithProviders(<CitationPanel citation={citation} onClose={vi.fn()} />);

        expect(document.querySelector("[data-escape-layer]")).toBe(screen.getByTestId("citation-panel"));
    });
});
