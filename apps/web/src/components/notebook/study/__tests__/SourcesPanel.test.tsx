import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { NotebookSource } from "@beyou/types/notebook/notebook";
import { renderWithProviders } from "../../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({
    getSources: vi.fn(),
    setSourceEnabled: vi.fn(),
    deleteSource: vi.fn(),
    addPdfSource: vi.fn(),
    addLinkSource: vi.fn(),
    addTextSource: vi.fn(),
}));

import { getSources } from "@beyou/api/notebook";
import SourcesPanel, { SOURCE_POLL_MS } from "../SourcesPanel";

const source = (over: Partial<NotebookSource>): NotebookSource => ({
    id: "s1",
    pageId: "p1",
    pageTitle: "Trees",
    inherited: false,
    kind: "PDF",
    title: "clrs.pdf",
    url: null,
    status: "READY",
    progress: 100,
    errorKey: null,
    enabled: true,
    pageCount: 24,
    charCount: 1000,
    createdAt: "2026-10-04T10:00:00Z",
    ...over,
});

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("SourcesPanel", () => {
    /** A source being read is polled until it is ready, then the polling stops. */
    test("polls while a source is being read and stops once it is ready", async () => {
        vi.mocked(getSources).mockResolvedValue({ success: [source({ status: "READY" })] });
        renderWithProviders(
            <SourcesPanel pageId="p1" initialSources={[source({ status: "READING", progress: 40 })]} />
        );
        expect(screen.getByTestId("study-source-reading")).toBeInTheDocument();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(SOURCE_POLL_MS);
        });
        expect(getSources).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId("study-source-reading")).toBeNull();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(SOURCE_POLL_MS * 3);
        });
        expect(getSources).toHaveBeenCalledTimes(1);
    });

    test("a failed source says why, in the reader's words", () => {
        renderWithProviders(
            <SourcesPanel
                pageId="p1"
                initialSources={[source({ status: "FAILED", errorKey: "NOTEBOOK_SOURCE_UNREADABLE" })]}
            />
        );
        expect(screen.getByText("NOTEBOOK_SOURCE_UNREADABLE")).toBeInTheDocument();
    });
});
