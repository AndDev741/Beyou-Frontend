import fs from "fs";
import path from "path";
import { resources } from '@beyou/i18n';

const en = resources.en.translation;
const pt = resources.pt.translation;

/**
 * Guard: every literal i18n key used in the codebase must exist in BOTH
 * locales (project convention: all user-facing text supports en and pt).
 *
 * A missing key silently renders raw (e.g. "DeleteHabitPhrase" shown to the
 * user inside the delete dialog), so this fails the build instead.
 *
 * Dynamic keys (t(variable), t(`template`)) are out of scope — only string
 * literals are extracted.
 */
const SRC_DIR = path.resolve(__dirname, "..");

function collectLiteralKeys(): Set<string> {
    const keys = new Set<string>();
    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir)) {
            const full = path.join(dir, entry);
            if (fs.statSync(full).isDirectory()) {
                walk(full);
                continue;
            }
            if (!/\.(tsx?|jsx?)$/.test(entry) || /\.test\./.test(entry)) continue;
            const source = fs.readFileSync(full, "utf8");
            for (const match of source.matchAll(/\bt\(\s*(["'])((?:(?!\1).)+)\1\s*[,)]/g)) {
                keys.add(match[2]);
            }
        }
    };
    walk(SRC_DIR);
    return keys;
}

test("every literal t() key exists in the EN and PT translation files", () => {
    const used = collectLiteralKeys();
    expect(used.size).toBeGreaterThan(200); // sanity: extraction actually ran

    const missingEn = [...used].filter((key) => !(key in en)).sort();
    const missingPt = [...used].filter((key) => !(key in pt)).sort();

    expect(missingEn).toEqual([]);
    expect(missingPt).toEqual([]);
});

test("EN and PT translation files declare the same keys", () => {
    const enKeys = new Set(Object.keys(en));
    const ptKeys = new Set(Object.keys(pt));

    const onlyEn = [...enKeys].filter((key) => !ptKeys.has(key)).sort();
    const onlyPt = [...ptKeys].filter((key) => !enKeys.has(key)).sort();

    expect(onlyEn).toEqual([]);
    expect(onlyPt).toEqual([]);
});
