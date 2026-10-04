import { describe, expect, it } from "vitest";
import type { Board, BoardNode } from "@beyou/types/notebook/notebook";
import { NODE_WIDTH, nextNodePosition, tidyLayout } from "./boardLayout";

const node = (id: string, kind: BoardNode["kind"] = "PAGE", x = 0, y = 0): BoardNode => ({
    id, kind, pageId: kind === "PAGE" ? `p-${id}` : null, title: id, icon: null, status: "TO_STUDY",
    progress: null, hasBoard: false, x, y, width: null, height: null, linked: false, homeTopicTitle: null,
});

describe("tidyLayout", () => {
    it("puts every node to the right of the nodes that point to it", () => {
        const board: Board = {
            pageId: "t",
            nodes: [node("c"), node("a"), node("b")],
            edges: [
                { id: "1", source: "a", target: "b" },
                { id: "2", source: "b", target: "c" },
            ],
        };
        const at = Object.fromEntries(tidyLayout(board).map((p) => [p.nodeId, p]));

        expect(at.b.x).toBeGreaterThanOrEqual(at.a.x + NODE_WIDTH);
        expect(at.c.x).toBeGreaterThanOrEqual(at.b.x + NODE_WIDTH);
    });

    /** A section is where the person put it; tidying never moves one. */
    it("leaves sections alone", () => {
        const board: Board = { pageId: "t", nodes: [node("a"), node("s", "SECTION", 500, 500)], edges: [] };

        expect(tidyLayout(board).map((p) => p.nodeId)).toEqual(["a"]);
    });

    it("places a new node to the right of what is there", () => {
        expect(nextNodePosition(null)).toEqual({ x: 40, y: 80 });
        const board: Board = { pageId: "t", nodes: [node("a", "PAGE", 40, 80), node("b", "PAGE", 300, 200)], edges: [] };
        expect(nextNodePosition(board)).toEqual({ x: 300 + NODE_WIDTH + 64, y: 80 });
    });
});
