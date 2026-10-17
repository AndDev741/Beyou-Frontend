import type { TFunction } from 'i18next';
import type { DiagramSpec } from '@beyou/types/notebook/diagram';

/** The diagram's title, or "Diagram" for one the AI left untitled. */
export const diagramTitle = (spec: DiagramSpec, t: TFunction): string => spec.title || t('DiagramUntitled');

/** "Sequence · 4 items": the kind and how many boxes, under a diagram's title. */
export const diagramMeta = (spec: DiagramSpec, t: TFunction): string =>
  t('DiagramMeta', { kind: t(`DiagramKind${spec.kind}`), count: spec.nodes.length });
