import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({
    saveStudySetup: vi.fn(),
    discoverSources: vi.fn(),
    addLinkSource: vi.fn(),
    addPdfSource: vi.fn(),
    addTextSource: vi.fn(),
}));

import { saveStudySetup } from "@beyou/api/notebook";
import StudySetup from "../StudySetup";

const SCOPES = [
    { scope: "PAGE" as const, pages: 1, words: 120 },
    { scope: "SUBTREE" as const, pages: 4, words: 2300 },
    { scope: "TOPIC" as const, pages: 9, words: 6100 },
];

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveStudySetup).mockImplementation(async (_page, setup) => ({
        success: { goal: setup.goal || null, scope: setup.scope, configuredAt: "2026-10-05T12:00:00Z" },
    }));
});

describe("StudySetup", () => {
    /** The goal and the scope the person picked are what is saved for the page. */
    test("saves the goal and the scope picked", async () => {
        const onSaved = vi.fn();
        renderWithProviders(
            <StudySetup pageId="p1" setup={{ goal: null, scope: "PAGE", configuredAt: null }} scopes={SCOPES}
                sources={[]} discovery={false} onSourceAdded={() => {}} onSaved={onSaved} />
        );

        fireEvent.change(screen.getByTestId("setup-goal"), { target: { value: "  Pass the C1 oral exam  " } });
        fireEvent.click(screen.getByTestId("setup-scope-SUBTREE").querySelector("input")!);
        await act(async () => { fireEvent.click(screen.getByTestId("setup-start")); });

        expect(saveStudySetup).toHaveBeenCalledWith("p1", { goal: "Pass the C1 oral exam", scope: "SUBTREE" }, expect.any(Function));
        expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ scope: "SUBTREE", goal: "Pass the C1 oral exam" }));
    });

    /** "Find sources for me" only shows when the server has a search to run it with. */
    test("offers to find sources only when discovery is on", () => {
        const props = { pageId: "p1", setup: { goal: null, scope: "PAGE" as const, configuredAt: null }, scopes: SCOPES,
            sources: [], onSourceAdded: () => {}, onSaved: () => {} };
        const { unmount } = renderWithProviders(<StudySetup {...props} discovery={false} />);
        expect(screen.queryByTestId("setup-find-sources")).toBeNull();
        unmount();

        renderWithProviders(<StudySetup {...props} discovery />);
        fireEvent.click(screen.getByTestId("setup-find-sources"));
        expect(screen.getByTestId("discover-sources")).toBeInTheDocument();
    });
});
