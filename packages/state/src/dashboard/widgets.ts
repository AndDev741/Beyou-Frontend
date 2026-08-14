/** Dashboard widget ids — single source of truth shared by web + mobile.
 *  Order is the default display order. */
export const WIDGET_IDS = [
  'worstArea',
  'constance',
  'constanceHeatmap',
  'betterArea',
  'dailyProgress',
  'fastTips',
  'levelProgress',
  'categoryBalance',
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

/** Widgets that render full-width (the "bigSize" ones). */
export const BIG_WIDGETS: readonly WidgetId[] = [
  'dailyProgress',
  'fastTips',
  'categoryBalance',
  // Sixteen weeks of squares in a 320px rail is legible; in a phone's carousel it
  // needs the whole width or the columns collapse into stripes.
  'constanceHeatmap',
];
