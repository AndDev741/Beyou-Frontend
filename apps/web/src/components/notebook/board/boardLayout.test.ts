import { describe, expect, it } from "vitest";
import type { Board, BoardNode } from "@beyou/types/notebook/notebook";
import { gridCell, nextNodePosition, tidyLayout } from "./boardLayout";

const node = (id: string, kind: BoardNode["kind"] = "PAGE", x = 0, y = 0): BoardNode => ({
    id, kind, pageId: kind === "PAGE" ? `p-${id}` : null, title: id, icon: null, status: "TO_STUDY",
    progress: null, hasBoard: false, x, y, width: null, height: null, linked: false, homeTopicTitle: null,
});

const chain = (...ids: string[]) => ids.slice(1).map((id, i) => ({ id: `e${i}`, source: ids[i], target: id }));

const positions = (board: Board) =>
    Object.fromEntries(tidyLayout(board).map((p) => [p.nodeId, `${p.x},${p.y}`]));

describe("tidyLayout", () => {
    /**
     * Reported from local testing: tidying a roadmap put every node on one long line. A chain
     * reads three to a row instead, each row going on where the last one ended.
     */
    it("lays a chain out three to a row in the order of its edges", () => {
        const board: Board = {
            pageId: "t",
            // Stored order and positions are scrambled on purpose; only the edges decide.
            nodes: [node("e", "PAGE", 900, 0), node("a", "PAGE", 600, 300), node("d"), node("b", "PAGE", 10, 900), node("c")],
            edges: chain("a", "b", "c", "d", "e"),
        };

        expect(positions(board)).toEqual({
            a: "40,0", b: "280,0", c: "520,0",
            d: "40,140", e: "280,140",
        });
    });

    /** The server lays a draft out on the same grid, so tidying a fresh draft moves nothing. */
    it("leaves a board the server just laid out exactly where it is", () => {
        const ids = ["a", "b", "c", "d", "e", "f", "g"];
        const board: Board = {
            pageId: "t",
            nodes: ids.map((id, i) => node(id, "PAGE", 40 + (i % 3) * 240, Math.floor(i / 3) * 140)),
            edges: chain(...ids),
        };

        for (const p of tidyLayout(board)) {
            const before = board.nodes.find((n) => n.id === p.nodeId)!;
            expect({ x: p.x, y: p.y }).toEqual({ x: before.x, y: before.y });
        }
    });

    /** Where no edge decides, the order the person left on the board does, nudges included. */
    it("keeps the reading order of nodes no edge orders", () => {
        const board: Board = {
            pageId: "t",
            nodes: [node("second", "PAGE", 300, 8), node("third", "PAGE", 50, 150), node("first", "PAGE", 40, -6)],
            edges: [],
        };

        expect(tidyLayout(board).map((p) => p.nodeId)).toEqual(["first", "second", "third"]);
    });

    it("still places every node when the edges loop", () => {
        const board: Board = {
            pageId: "t",
            nodes: [node("a"), node("b", "PAGE", 300, 0)],
            edges: [{ id: "1", source: "a", target: "b" }, { id: "2", source: "b", target: "a" }],
        };

        expect(tidyLayout(board).map((p) => p.nodeId)).toEqual(["a", "b"]);
    });

    /** A section is where the person put it; tidying never moves one. */
    it("leaves sections alone", () => {
        const board: Board = { pageId: "t", nodes: [node("a"), node("s", "SECTION", 500, 500)], edges: [] };

        expect(tidyLayout(board).map((p) => p.nodeId)).toEqual(["a"]);
    });
});

describe("nextNodePosition", () => {
    it("takes the next cell of the grid", () => {
        expect(nextNodePosition(null)).toEqual(gridCell(0));
        const board: Board = {
            pageId: "t",
            nodes: [0, 1, 2].map((i) => node(`n${i}`, "PAGE", gridCell(i).x, gridCell(i).y)),
            edges: [],
        };
        // Three on the first row: the fourth starts the second.
        expect(nextNodePosition(board)).toEqual({ x: 40, y: 140 });
    });

    it("skips a cell a node was dragged onto", () => {
        const board: Board = {
            pageId: "t",
            // Two nodes, so the next cell is the third; one was dragged onto it.
            nodes: [node("a", "PAGE", 40, 0), node("dragged", "PAGE", 530, 6)],
            edges: [],
        };

        expect(nextNodePosition(board)).toEqual(gridCell(3));
    });
});
