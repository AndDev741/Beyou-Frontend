import type { MiniEdge, MiniNode } from "@beyou/types/notebook/notebook";

/**
 * A topic card's thumbnail: its board's nodes as dots, scaled into the card, with straight lines
 * for the edges. Decoration, so it is hidden from assistive tech; the card says the same in words.
 */
export default function MiniRoadmap({ nodes, edges }: { nodes: MiniNode[]; edges: MiniEdge[] }) {
    const width = 320;
    const height = 96;
    if (nodes.length === 0) {
        return <div aria-hidden="true" className="h-24 rounded-xl bg-bg" />;
    }
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 22;
    const sx = (x: number) => (maxX === minX ? width / 2 : pad + ((x - minX) / (maxX - minX)) * (width - pad * 2));
    const sy = (y: number) => (maxY === minY ? height / 2 : pad - 4 + ((y - minY) / (maxY - minY)) * (height - (pad - 4) * 2));
    const at = new Map(nodes.map((n) => [n.id, { x: sx(n.x), y: sy(n.y), status: n.status }]));

    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet"
            aria-hidden="true" className="block rounded-xl bg-bg">
            {edges.map((e) => {
                const a = at.get(e.source);
                const b = at.get(e.target);
                if (!a || !b) return null;
                const walked = a.status !== "TO_STUDY";
                return (
                    <path key={`${e.source}-${e.target}`} d={`M${a.x} ${a.y} H${(a.x + b.x) / 2} V${b.y} H${b.x}`} fill="none"
                        strokeWidth={2} className={walked ? "stroke-accent" : "stroke-border"} />
                );
            })}
            {nodes.map((n) => {
                const p = at.get(n.id)!;
                if (n.status === "DONE") return <circle key={n.id} cx={p.x} cy={p.y} r={8} className="fill-accent" />;
                if (n.status === "STUDYING") {
                    return (
                        <g key={n.id}>
                            <circle cx={p.x} cy={p.y} r={8} className="fill-surface stroke-accent" strokeWidth={3} />
                            <path d={`M${p.x} ${p.y - 8} A8 8 0 0 1 ${p.x} ${p.y + 8} Z`} className="fill-accent" />
                        </g>
                    );
                }
                return <circle key={n.id} cx={p.x} cy={p.y} r={8} className="fill-surface stroke-border" strokeWidth={2} />;
            })}
        </svg>
    );
}
