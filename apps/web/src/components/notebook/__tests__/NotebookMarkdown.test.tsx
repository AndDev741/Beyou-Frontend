import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { Citation } from "@beyou/types/notebook/notebook";
import NotebookMarkdown from "../NotebookMarkdown";

const citation = (n: number): Citation => ({
    n, kind: "SOURCE", sourceId: "s", chunkId: `c${n}`, pageId: null, title: `Source ${n}`, pageNumber: 296, excerpt: "text",
});

describe("NotebookMarkdown", () => {
    /** A marker with nothing behind it would be a chip that opens nothing, so it is dropped. */
    test("turns known markers into chips and drops unknown ones", () => {
        const onCitation = vi.fn();
        render(<NotebookMarkdown markdown="Use the successor [1]. Also [2, 7]." citations={[citation(1), citation(2)]} onCitation={onCitation} />);

        fireEvent.click(screen.getByTestId("citation-2"));

        expect(screen.getByTestId("citation-1")).toBeInTheDocument();
        expect(screen.queryByTestId("citation-7")).toBeNull();
        expect(onCitation).toHaveBeenCalledWith(expect.objectContaining({ n: 2 }));
    });
});
