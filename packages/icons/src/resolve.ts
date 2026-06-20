import emojiCharMap from './data/emojiCharMap.json';
import type { IconDescriptor } from './types';

const FALLBACK: IconDescriptor = { kind: 'fallback' };
const emojiMap = emojiCharMap as Record<string, string>;
const EMOJI_CHAR = /\p{Extended_Pictographic}/u;

const LUCIDE_PREFIX = 'lucide:';
const EMOJI_PREFIX = 'emoji:';

/**
 * Resolve a stored iconId to a renderable descriptor. Lightweight (only the
 * emoji char map) so React Native renderers don't pull the full registry/catalog.
 *
 * - `lucide:<name>`  → { lucide, name }
 * - `emoji:<short>`  → { emoji, char } (or fallback if unknown)
 * - raw emoji char   → { emoji, char }  (legacy)
 * - anything else (legacy react-icons `ri:*`, bare names, "") → { fallback }
 */
export function resolveIcon(id?: string | null): IconDescriptor {
  if (!id) return FALLBACK;
  if (id.startsWith(LUCIDE_PREFIX)) {
    const name = id.slice(LUCIDE_PREFIX.length);
    return name ? { kind: 'lucide', name } : FALLBACK;
  }
  if (id.startsWith(EMOJI_PREFIX)) {
    const char = emojiMap[id.slice(EMOJI_PREFIX.length)];
    return char ? { kind: 'emoji', char } : FALLBACK;
  }
  if (!id.includes(':') && !id.includes('/') && EMOJI_CHAR.test(id)) {
    return { kind: 'emoji', char: id };
  }
  return FALLBACK;
}
