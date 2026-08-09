import { describe, it, expect } from "vitest";
import { resolvePhotoUrl } from "./photoUrl";

describe("resolvePhotoUrl", () => {
    it("returns empty string for empty/null input", () => {
        expect(resolvePhotoUrl("")).toBe("");
    });

    it("prepends the backend origin to a root-relative served path", () => {
        expect(resolvePhotoUrl("/api/v1/user/photo/abc?v=123")).toBe(
            "http://localhost:8099/api/v1/user/photo/abc?v=123"
        );
    });

    it("passes through an https Google CDN URL", () => {
        const url = "https://lh3.googleusercontent.com/a/x";
        expect(resolvePhotoUrl(url)).toBe(url);
    });

    it("passes through a local object URL", () => {
        expect(resolvePhotoUrl("blob:http://localhost/abc")).toBe("blob:http://localhost/abc");
    });

    it("drops unsafe schemes so they can't reach an <img src>", () => {
        expect(resolvePhotoUrl("javascript:alert(1)")).toBe("");
        expect(resolvePhotoUrl("data:text/html,<script>alert(1)</script>")).toBe("");
        expect(resolvePhotoUrl("vbscript:msgbox(1)")).toBe("");
    });

    it("keeps a data: URL only when it is an image", () => {
        const png = "data:image/png;base64,iVBORw0KGgo=";
        expect(resolvePhotoUrl(png)).toBe(png);
    });

    /** Antes a regex deixava passar qualquer coisa que começasse com o esquema. */
    it("drops a malformed URL", () => {
        expect(resolvePhotoUrl("https://")).toBe("");
        expect(resolvePhotoUrl("http:")).toBe("");
    });
});
