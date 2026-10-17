import type { Tokens } from '@beyou/theme';
import { diagramColors, layoutDiagram, parseDiagramProp, sceneToSvg } from '@beyou/state/notebook/diagram';

/**
 * A diagram block's drawing for the editor's web view: its title and a standalone SVG, or null when
 * the block's `spec` prop does not draw.
 *
 * The web view is a DOM, so the shared `sceneToSvg` serves as the renderer. Its markup is built
 * from the cleaned spec only (`parseDiagramProp` runs the client sanitizer) and every text in it is
 * escaped, which is what makes it safe to set as HTML. Kept out of the `'use dom'` file so jest can
 * reach it.
 */
export function diagramMarkup(prop: unknown, tokens: Tokens, width: number): { title: string; svg: string } | null {
  const spec = typeof prop === 'string' ? parseDiagramProp(prop) : null;
  if (!spec) return null;
  const scene = layoutDiagram(spec, { maxWidth: width });
  return {
    title: spec.title,
    svg: sceneToSvg(scene, diagramColors(tokens), { title: spec.title || undefined }),
  };
}
