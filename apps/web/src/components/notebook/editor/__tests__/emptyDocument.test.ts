import { describe, expect, it } from "vitest";
import { isEmptyDocument } from "../emptyDocument";

const paragraph = (text?: string) => ({
    type: "paragraph",
    content: text ? [{ type: "text", text, styles: {} }] : [],
    children: [],
});

describe("isEmptyDocument", () => {
    it("is true for what a page nobody has written in holds", () => {
        expect(isEmptyDocument([paragraph()])).toBe(true);
        expect(isEmptyDocument([paragraph(), paragraph()])).toBe(true);
        expect(isEmptyDocument([])).toBe(true);
    });

    it("is false the moment there is a word, a block of another kind, or a nested one", () => {
        expect(isEmptyDocument([paragraph("Notes")])).toBe(false);
        expect(isEmptyDocument([{ type: "flashcards", children: [] }, paragraph()])).toBe(false);
        expect(isEmptyDocument([{ type: "heading", content: [], children: [] }])).toBe(false);
        expect(isEmptyDocument([{ ...paragraph(), children: [paragraph("inside")] }])).toBe(false);
    });
});
