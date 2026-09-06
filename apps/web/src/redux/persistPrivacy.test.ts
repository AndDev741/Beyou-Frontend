import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What the store is allowed to leave on disk.
 *
 * Read from the source rather than by booting the store: `store.ts` calls `persistStore()` at
 * module load, so importing it here would do real localStorage I/O inside the vitest worker —
 * the same reason `persistMigrations` was split out into its own module.
 *
 * The slice this is really about is `mood`. It holds journal text, which is the most personal
 * thing the product stores, and the failure mode is silent: everything works, and someone's diary
 * simply sits in localStorage after they close the tab, readable by anything else running on the
 * origin. Nothing in the UI would ever show that, so a test is the only thing that can.
 */
const source = readFileSync(join(__dirname, "store.ts"), "utf8");

const blacklist = (): string[] => {
    const match = source.match(/blacklist:\s*\[([^\]]*)\]/);
    if (!match) throw new Error("store.ts no longer declares a persist blacklist");
    return match[1]
        .split(",")
        .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
};

describe("persist blacklist", () => {
    it("keeps the mood slice out of storage, because it holds journal text", () => {
        expect(blacklist()).toContain("mood");
    });

    it("still keeps the slices that were already excluded", () => {
        // Regression guard: a careless edit that replaces the array instead of extending it.
        expect(blacklist()).toEqual(expect.arrayContaining(["snapshot", "perfil", "celebration"]));
    });
});
