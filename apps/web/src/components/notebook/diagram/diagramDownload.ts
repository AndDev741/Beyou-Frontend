import type { DiagramSpec } from "@beyou/types/notebook/diagram";
import { layoutDiagram, sceneToSvg, type DiagramColors } from "@beyou/state";
import { diagramFileName } from "./diagramUi";

/** Exports are laid out for a wide sheet, whatever the size of the block on screen. */
const EXPORT_WIDTH = 960;
/** PNGs are drawn at twice the scene's size, so they stay sharp on a high-density screen. */
const PNG_SCALE = 2;

/** The diagram as a standalone SVG with its background, the theme's colors written in. */
export function diagramSvg(spec: DiagramSpec, colors: DiagramColors): { svg: string; width: number; height: number } {
    const scene = layoutDiagram(spec, { maxWidth: EXPORT_WIDTH });
    return { svg: sceneToSvg(scene, colors, { title: spec.title || undefined, background: true }), width: scene.width, height: scene.height };
}

/** Saves a blob through a temporary `<a download>`, the one way every browser honours a file name. */
function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Some browsers read the URL after click() returns; give them a moment before letting it go.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDiagramSvg(spec: DiagramSpec, colors: DiagramColors) {
    const { svg } = diagramSvg(spec, colors);
    saveBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), diagramFileName(spec, "svg"));
}

/**
 * Rasterizes the SVG on a canvas at 2x and saves the PNG. The SVG goes in as a data: URL, never
 * a blob: one: the app's CSP allows data: images, and an SVG loaded from a data URL cannot reach
 * anything outside itself, so the canvas stays clean enough to export.
 *
 * An image cannot use the page's web fonts, so the PNG's text falls back to the system sans when
 * Geist is not installed; line breaks were measured for Geist and still fit, with a little slack.
 */
export function downloadDiagramPng(spec: DiagramSpec, colors: DiagramColors): Promise<void> {
    const { svg, width, height } = diagramSvg(spec, colors);
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(width * PNG_SCALE);
            canvas.height = Math.ceil(height * PNG_SCALE);
            const context = canvas.getContext("2d");
            if (!context) {
                reject(new Error("no 2d context"));
                return;
            }
            context.scale(PNG_SCALE, PNG_SCALE);
            context.drawImage(image, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("canvas produced no image"));
                    return;
                }
                saveBlob(blob, diagramFileName(spec, "png"));
                resolve();
            }, "image/png");
        };
        image.onerror = () => reject(new Error("the svg did not load"));
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
}
