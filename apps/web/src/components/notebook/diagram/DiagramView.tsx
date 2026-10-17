import { memo, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { DiagramSpec } from "@beyou/types/notebook/diagram";
import {
    DEFAULT_DIAGRAM_WIDTH,
    diagramText,
    layoutDiagram,
    shapePaint,
    textColor,
    type DiagramColors,
    type DiagramScene,
} from "@beyou/state";
import { useDiagramColors } from "./diagramUi";

const FONT = "Geist, 'Geist Fallback', system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "'Geist Mono', ui-monospace, monospace";

/** Narrower than this and every kind is already in its phone form; laying out smaller only cramps it. */
const MIN_LAYOUT_WIDTH = 240;

type Props = {
    /** A clean spec (sanitizeDiagram), or null for one that does not draw. */
    spec: DiagramSpec | null;
    /**
     * How far past its natural size the drawing may grow to fill a wide container. A small
     * diagram stretched to a full page column looks inflated, so it stops at 115% by default.
     */
    maxScale?: number;
    /**
     * Lay out for this width instead of measuring the container: thumbnails, which are drawn at
     * a normal width and scaled down rather than squeezed into a phone form.
     */
    layoutWidth?: number;
    className?: string;
};

/**
 * Draws a diagram spec as an SVG of React elements, from the scene the shared layout places
 * (layoutDiagram). Nothing here decides where anything goes: shapes map to elements and roles to
 * the theme's colors, so the web and the phone draw the same picture.
 *
 * The container's width is measured and handed to the layout, which switches some kinds to a
 * vertical form when they would not fit; the SVG then scales to the container through its
 * viewBox. No markup from a model or a stored block is ever injected: every label is a text node.
 */
function DiagramView({ spec, maxScale = 1.15, layoutWidth, className = "" }: Props) {
    const { t } = useTranslation();
    const colors = useDiagramColors();
    const ref = useRef<HTMLDivElement>(null);
    const measured = useContainerWidth(ref, layoutWidth === undefined);
    const width = layoutWidth ?? measured;

    const scene = useMemo(() => (spec ? layoutDiagram(spec, { maxWidth: width }) : null), [spec, width]);
    const label = useMemo(() => (spec ? diagramText(spec) : ""), [spec]);

    return (
        <div ref={ref} data-testid="diagram-view" className={className}>
            {!spec || !scene ? (
                <p role="note" data-testid="diagram-invalid"
                    className="rounded-control border border-dashed border-border px-4 py-6 text-center text-sm text-text-2">
                    {t("DiagramInvalid")}
                </p>
            ) : (
                <svg
                    role="img"
                    aria-label={label}
                    viewBox={`0 0 ${scene.width} ${scene.height}`}
                    width="100%"
                    fontFamily={FONT}
                    style={{
                        display: "block",
                        margin: "0 auto",
                        height: "auto",
                        maxWidth: Math.round(scene.width * maxScale),
                        aspectRatio: `${scene.width} / ${scene.height}`,
                    }}
                >
                    <SceneElements scene={scene} colors={colors} />
                </svg>
            )}
        </div>
    );
}

export default memo(DiagramView);

/** The scene's shapes, then its texts, in the order the layout listed them. */
const SceneElements = memo(function SceneElements({ scene, colors }: { scene: DiagramScene; colors: DiagramColors }) {
    return (
        <>
            {scene.shapes.map((shape, index) => {
                const paint = shapePaint(shape, colors);
                const stroke = paint.stroke !== "none" ? { stroke: paint.stroke, strokeWidth: paint.strokeWidth } : {};
                switch (shape.type) {
                    case "rect":
                        return <rect key={index} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} fill={paint.fill} {...stroke} />;
                    case "pill":
                        return <rect key={index} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={9} fill={paint.fill} />;
                    case "dot":
                        return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={paint.fill} {...stroke} />;
                    case "head":
                        return <path key={index} d={shape.d} fill={paint.fill} />;
                    case "path":
                        return (
                            <path key={index} d={shape.d} fill="none" stroke={paint.stroke} strokeWidth={paint.strokeWidth}
                                strokeLinecap="round" strokeLinejoin="round" strokeDasharray={shape.dashed ? "5 5" : undefined} />
                        );
                    default:
                        return null;
                }
            })}
            {scene.texts.map((text, index) => (
                <text key={`t${index}`} x={text.x} y={text.y} fontSize={text.size} fontWeight={text.weight}
                    textAnchor={text.anchor} fill={textColor(text, colors)} fontFamily={text.mono ? MONO : undefined}>
                    {text.text}
                </text>
            ))}
        </>
    );
});

/**
 * The element's width, kept current with a ResizeObserver, in steps of 16px so a window being
 * dragged wider does not lay the diagram out again on every pixel. Before the first measure (and
 * where there is no layout, as in tests) it is the layout's default width.
 */
function useContainerWidth(ref: RefObject<HTMLElement | null>, enabled: boolean): number {
    const [width, setWidth] = useState(DEFAULT_DIAGRAM_WIDTH);
    useLayoutEffect(() => {
        const element = ref.current;
        if (!enabled || !element) return;
        const apply = (raw: number) => {
            if (raw <= 0) return;
            setWidth(Math.max(MIN_LAYOUT_WIDTH, Math.round(raw / 16) * 16));
        };
        apply(element.clientWidth);
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver((entries) => apply(entries[0]?.contentRect.width ?? 0));
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref, enabled]);
    return width;
}
