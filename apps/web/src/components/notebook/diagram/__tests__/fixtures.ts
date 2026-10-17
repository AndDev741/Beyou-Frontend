import type { DiagramSpec } from "@beyou/types/notebook/diagram";

/** A small flow every diagram test draws: three states, two transitions. */
export const lifecycle: DiagramSpec = {
    v: 1,
    kind: "FLOW",
    title: "Transaction lifecycle",
    nodes: [
        { id: "a", label: "Active", detail: "reading and writing", tone: "ACCENT" },
        { id: "b", label: "Committed", detail: null, tone: "SUCCESS" },
        { id: "c", label: "Failed", detail: null, tone: "DANGER" },
    ],
    links: [
        { from: "a", to: "b", label: "commit", dashed: false },
        { from: "a", to: "c", label: "error", dashed: true },
    ],
};
