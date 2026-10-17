import { useMemo } from "react";
import { ArrowRightLeft, GitCommitHorizontal, Layers, Network, RotateCw, Workflow, type LucideIcon } from "lucide-react";
import { DIAGRAM_LIMITS, type DiagramKind, type DiagramSpec } from "@beyou/types/notebook/diagram";
import { diagramColors, type DiagramColors } from "@beyou/state";
import { useTheme } from "../../../context/ThemeContext";

/** The icon each kind wears on the card, the toolbar and the chips (the design's Tipos board). */
export const KIND_ICONS: Record<DiagramKind, LucideIcon> = {
    FLOW: Workflow,
    MAP: Network,
    CYCLE: RotateCw,
    SEQUENCE: ArrowRightLeft,
    LAYERS: Layers,
    TIMELINE: GitCommitHorizontal,
};

/**
 * The drawing's colors for the theme on screen. Concrete values rather than CSS variables, so a
 * downloaded SVG or PNG looks the same outside the app; they follow a theme switch because the
 * theme object changes with it.
 */
export function useDiagramColors(): DiagramColors {
    const { theme } = useTheme();
    return useMemo(() => diagramColors(theme), [theme]);
}

/**
 * Whether a diagram of `count` boxes can become `kind` without losing any. The sanitizer drops
 * boxes past a kind's cap (a sequence has six participants at most), so a switch that would
 * drop some is offered disabled instead of quietly throwing boxes away.
 */
export const kindFits = (kind: DiagramKind, count: number): boolean => count <= DIAGRAM_LIMITS.kindNodes[kind];

/** Kinds whose drawing reads `links`. Layers and timelines ignore them. */
export const usesLinks = (kind: DiagramKind): boolean => kind !== "LAYERS" && kind !== "TIMELINE";

/** A file name for a download: the title, plain, or "diagram". */
export function diagramFileName(spec: DiagramSpec, extension: string): string {
    const base = spec.title
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
    return `${base || "diagram"}.${extension}`;
}
