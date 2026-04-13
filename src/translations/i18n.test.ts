import { describe, it, expect } from "vitest";
import i18n from "./i18n";

describe("i18n configuration", () => {
  it("has escapeValue enabled to prevent XSS from interpolated values", () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(true);
  });

  it("escapes HTML in interpolated values", () => {
    // Add a test resource
    i18n.addResource("en", "translation", "xssTestKey", "Hello, {{name}}!");
    const result = i18n.t("xssTestKey", { name: "<script>alert(1)</script>" });
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });
});
