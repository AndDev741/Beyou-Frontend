/**
 * Regenerates the committed icon data:
 *   - src/data/lucideNames.json    — every Lucide icon name (kebab), from the
 *     installed lucide-react dist (single source of truth for the picker).
 *   - src/data/emojiCharMap.json   — slim { short_name: char } from emoji-datasource,
 *     so neither platform bundles the ~1.8MB dataset at runtime.
 *   - src/data/emojiMeta.json      — { short_name: { a: [aliases], c: category } }, and
 *     only for the emoji that need an entry. Aliases make "thumbsup" find the emoji
 *     whose primary short_name is "+1"; the category feeds the picker taxonomy. Only
 *     the four dataset groups that map onto our categories are kept — writing all ten
 *     for all 1900 emoji tripled registry build time for data nothing reads.
 *   - src/data/extraIconNodes.json — raw SVG path data for the lucide names that
 *     lucide-react-native does NOT export (brand marks lucide dropped upstream for
 *     trademark reasons). Mobile renders these through lucide-react-native's own
 *     `Icon` factory, so they behave like any other icon. Generated, not
 *     hand-maintained: bump either lucide package and this list re-derives itself.
 *
 * Run from the repo root (where node_modules lives):  node packages/icons/scripts/generate-data.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../src/data');
const repoRoot = resolve(here, '../../..');

// --- Lucide names from the installed dist (one file per icon) ---
const lucideIconsDir = resolve(repoRoot, 'node_modules/lucide-react/dist/esm/icons');
const lucideNames = readdirSync(lucideIconsDir)
  .filter((f) => f.endsWith('.js') && !f.endsWith('.js.map'))
  .map((f) => f.replace(/\.js$/, ''))
  // `index.js` is the barrel that re-exports every icon, not an icon. It used to
  // land in the registry as a phantom `lucide:index` tile that rendered nothing
  // on either platform (it is not a valid dynamic-icon key on web either).
  .filter((name) => name !== 'index')
  .sort();
writeFileSync(join(dataDir, 'lucideNames.json'), JSON.stringify(lucideNames, null, 0) + '\n');

// --- Slim emoji short_name -> char map, plus aliases/category metadata ---
const emojiData = require('emoji-datasource/emoji.json');
const emojiFromUnified = (unified) =>
  String.fromCodePoint(...unified.split('-').map((u) => parseInt(u, 16)));
// Primary short_name only (matches the stored `emoji:${short_name}` ids); the alt
// names ride along in emojiMeta so search can match them without inventing entries.
// Keep this list in step with EMOJI_CATEGORY_MAP in registry.ts.
const KEPT_CATEGORIES = new Set(['Animals & Nature', 'Food & Drink', 'Travel & Places', 'Activities']);
const emojiMap = {};
const emojiMeta = {};
for (const e of emojiData) {
  if (!e.unified || !e.short_name) continue;
  emojiMap[e.short_name] = emojiFromUnified(e.unified);
  const aliases = (e.short_names || []).filter((n) => n !== e.short_name);
  const meta = {};
  if (aliases.length) meta.a = aliases;
  if (e.category && KEPT_CATEGORIES.has(e.category)) meta.c = e.category;
  if (Object.keys(meta).length) emojiMeta[e.short_name] = meta;
}
writeFileSync(join(dataDir, 'emojiCharMap.json'), JSON.stringify(emojiMap, null, 0) + '\n');
writeFileSync(join(dataDir, 'emojiMeta.json'), JSON.stringify(emojiMeta, null, 0) + '\n');

// --- SVG path data for names lucide-react-native cannot render ---
// The RN barrel re-exports deprecated aliases (Home -> house.mjs), so the only way
// to know what is genuinely absent is to parse its export list, not its file tree.
const rnBarrel = resolve(
  repoRoot,
  'apps/mobile/node_modules/lucide-react-native/dist/esm/lucide-react-native.mjs',
);
const extraIconNodes = {};
if (existsSync(rnBarrel)) {
  const exported = new Set(
    [...readFileSync(rnBarrel, 'utf8').matchAll(/default as ([A-Za-z0-9_]+)/g)].map((m) => m[1]),
  );
  const toPascal = (kebab) =>
    kebab
      .split('-')
      .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ''))
      .join('');
  for (const name of lucideNames) {
    if (exported.has(toPascal(name))) continue;
    // Pull `__iconNode` straight out of the web icon module — same shape the RN
    // `Icon` component takes as its `iconNode` prop.
    const { __iconNode } = await import(
      new URL(`file://${join(lucideIconsDir, `${name}.js`)}`).href
    );
    if (__iconNode) extraIconNodes[name] = __iconNode;
  }
} else {
  console.warn('lucide-react-native not installed — skipping extraIconNodes (kept as-is)');
}
if (Object.keys(extraIconNodes).length) {
  writeFileSync(join(dataDir, 'extraIconNodes.json'), JSON.stringify(extraIconNodes, null, 0) + '\n');
}

console.log(
  `lucideNames: ${lucideNames.length}, emoji: ${Object.keys(emojiMap).length}, ` +
    `emojiMeta: ${Object.keys(emojiMeta).length}, extraIconNodes: ${Object.keys(extraIconNodes).length}`,
);
