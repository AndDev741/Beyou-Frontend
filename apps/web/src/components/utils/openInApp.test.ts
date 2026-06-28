import { describe, it, expect, afterEach, vi } from "vitest";
import { buildAppLink, isMobileDevice } from "./openInApp";

describe("buildAppLink", () => {
    it("builds a beyou:// deep link with an encoded token", () => {
        expect(buildAppLink("reset", "a b/c")).toBe("beyou://reset?token=a%20b%2Fc");
        expect(buildAppLink("verify", "tok123")).toBe("beyou://verify?token=tok123");
    });
});

describe("isMobileDevice", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("is true for an Android user agent", () => {
        vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)" });
        expect(isMobileDevice()).toBe(true);
    });

    it("is true for an iPhone user agent", () => {
        vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" });
        expect(isMobileDevice()).toBe(true);
    });

    it("is false for a desktop user agent", () => {
        vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" });
        expect(isMobileDevice()).toBe(false);
    });
});
