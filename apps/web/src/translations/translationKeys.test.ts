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

/**
 * Every key in both locales, nested ones included, as dotted paths.
 *
 * Object.keys alone stops at the top level, which left whole nested blocks
 * unguarded — `AgentTool` holds one label per agent tool and a label added to
 * only one language passed this test. The agent chat reads those through a
 * template literal (`t(\`AgentTool.${tool}\`, tool)`), so a missing one does not
 * throw: it renders the raw tool name, e.g. "createUserListRoutine".
 */
function flattenKeys(node: unknown, prefix = ""): string[] {
    if (node === null || typeof node !== "object") return [prefix];
    return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
        flattenKeys(value, prefix ? `${prefix}.${key}` : key),
    );
}

test("EN and PT translation files declare the same keys, nested ones included", () => {
    const enKeys = new Set(flattenKeys(en));
    const ptKeys = new Set(flattenKeys(pt));

    const onlyEn = [...enKeys].filter((key) => !ptKeys.has(key)).sort();
    const onlyPt = [...ptKeys].filter((key) => !enKeys.has(key)).sort();

    expect(onlyEn).toEqual([]);
    expect(onlyPt).toEqual([]);
});
