import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../../../test/test-utils";

vi.mock("@beyou/api/notebook", () => ({
    discoverSources: vi.fn(),
    addLinkSource: vi.fn(),
}));

import { addLinkSource, discoverSources } from "@beyou/api/notebook";
import DiscoverSources from "../DiscoverSources";

const FOUND = {
    provider: "TAVILY",
    skipped: 1,
    sources: [
        { title: "Subjunctive guide", url: "https://example.org/guide", domain: "example.org", summary: "When to use it." },
        { title: "Exercises", url: "https://example.org/drills", domain: "example.org", summary: "Fifty drills." },
        { title: "Forum thread", url: "https://forum.example/t/1", domain: "forum.example", summary: "Opinions." },
    ],
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(discoverSources).mockResolvedValue({ success: FOUND });
    vi.mocked(addLinkSource).mockImplementation(async (_page, url) => ({ success: { id: url, url } as never }));
});

describe("DiscoverSources", () => {
    /** What was found starts ticked; only what is still ticked is added, one link source each. */
    test("adds only the sources still ticked, and tells the list about each", async () => {
        const onAdded = vi.fn();
        renderWithProviders(<DiscoverSources pageId="p1" onAdded={onAdded} />);

        fireEvent.change(screen.getByTestId("discover-description"), { target: { value: "subjunctive with exercises" } });
        await act(async () => { fireEvent.click(screen.getByTestId("discover-find")); });

        expect(discoverSources).toHaveBeenCalledWith("p1", "subjunctive with exercises", expect.any(Function));
        const results = screen.getAllByTestId("discover-result");
        expect(results).toHaveLength(3);
        results.forEach((row) => expect(row.querySelector("input")).toBeChecked());

        fireEvent.click(results[2].querySelector("input")!);
        await act(async () => { fireEvent.click(screen.getByTestId("discover-add")); });

        expect(addLinkSource).toHaveBeenCalledTimes(2);
        expect(addLinkSource).toHaveBeenCalledWith("p1", "https://example.org/guide", expect.any(Function));
        expect(addLinkSource).toHaveBeenCalledWith("p1", "https://example.org/drills", expect.any(Function));
        expect(onAdded).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId("discover-added")).toHaveTextContent("NotebookDiscoverAdded");
    });

    test("says so when nothing new turned up", async () => {
        vi.mocked(discoverSources).mockResolvedValue({ success: { provider: "GEMINI", skipped: 4, sources: [] } });
        renderWithProviders(<DiscoverSources pageId="p1" onAdded={() => {}} />);

        fireEvent.change(screen.getByTestId("discover-description"), { target: { value: "something obscure" } });
        await act(async () => { fireEvent.click(screen.getByTestId("discover-find")); });

        expect(screen.getByTestId("discover-none")).toBeInTheDocument();
        expect(screen.queryByTestId("discover-add")).toBeNull();
    });
});
