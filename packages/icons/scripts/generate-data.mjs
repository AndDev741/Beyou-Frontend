/**
 * Regenerates the committed icon data:
 *   - src/data/lucideNames.json   — every Lucide icon name (kebab), from the
 *     installed lucide-react dist (single source of truth; same names work in
 *     lucide-react-native).
 *   - src/data/emojiCharMap.json  — slim { short_name: char } from emoji-datasource,
 *     so neither platform bundles the ~1.8MB dataset at runtime.
 *
 * Run from the repo root (where node_modules lives):  node packages/icons/scripts/generate-data.mjs
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../src/data');

// --- Lucide names from the installed dist (one file per icon) ---
const lucideIconsDir = resolve(here, '../../../node_modules/lucide-react/dist/esm/icons');
const lucideNames = readdirSync(lucideIconsDir)
  .filter((f) => f.endsWith('.js') && !f.endsWith('.js.map'))
  .map((f) => f.replace(/\.js$/, ''))
  .sort();
writeFileSync(join(dataDir, 'lucideNames.json'), JSON.stringify(lucideNames, null, 0) + '\n');

// --- Slim emoji short_name -> char map ---
const emojiData = require('emoji-datasource/emoji.json');
const emojiFromUnified = (unified) =>
  String.fromCodePoint(...unified.split('-').map((u) => parseInt(u, 16)));
// Primary short_name only (matches the web picker's `emoji:${short_name}` ids);
// alt names are handled as search keywords, not separate entries.
const emojiMap = {};
for (const e of emojiData) {
  if (!e.unified || !e.short_name) continue;
  emojiMap[e.short_name] = emojiFromUnified(e.unified);
}
writeFileSync(join(dataDir, 'emojiCharMap.json'), JSON.stringify(emojiMap, null, 0) + '\n');

console.log(`lucideNames: ${lucideNames.length}, emoji: ${Object.keys(emojiMap).length}`);
