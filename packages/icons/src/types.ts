export type IconKind = 'lucide' | 'emoji';

/** A registry entry (search/picker metadata). No React types — platform-neutral. */
export interface IconEntry {
  /** Canonical id: `lucide:house` or `emoji:fire`. */
  id: string;
  type: IconKind;
  label: string;
  keywords: string[];
  categories: string[];
  legacyIds: string[];
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
