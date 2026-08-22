export type IconKind = 'lucide' | 'emoji';

/**
 * A lucide icon's raw SVG children, as `[tag, attributes]` pairs — the shape both
 * `lucide-react` modules export as `__iconNode` and `lucide-react-native`'s generic
 * `Icon` takes as its `iconNode` prop. Used for the brand marks the native package
 * no longer exports.
 */
export type LucideIconNode = Array<[string, Record<string, string | number>]>;

/** A registry entry (search/picker metadata). No React types — platform-neutral. */
export interface IconEntry {
  /** Canonical id: `lucide:house` or `emoji:fire`. */
  id: string;
  type: IconKind;
  label: string;
  keywords: string[];
  categories: string[];
  legacyIds: string[];
  /** Alternative full names an entry answers to (emoji `short_names`). */
  altNames?: string[];
  /** Present when type === 'lucide' — the lucide kebab name (e.g. "house"). */
  lucideName?: string;
  /** Present when type === 'emoji' — the rendered char (e.g. "🔥"). */
  emoji?: string;
}

/** What a renderer needs to draw an icon id. `fallback` = unresolvable id. */
export type IconDescriptor =
  | { kind: 'lucide'; name: string }
  | { kind: 'emoji'; char: string }
  | { kind: 'fallback' };
