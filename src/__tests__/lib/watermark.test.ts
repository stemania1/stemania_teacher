import { encodeWatermark, decodeWatermark, injectWatermarkIntoHtml } from "@/lib/watermark";

describe("encodeWatermark / decodeWatermark", () => {
  it("round-trips a payload", () => {
    const encoded = encodeWatermark(42, "2024-01-15T10:30:00.000Z");
    const decoded = decodeWatermark(encoded);
    expect(decoded).toBe("42:2024-01-15T10:30:00.000Z");
  });

  it("handles large employee numbers", () => {
    const encoded = encodeWatermark(999999, "2024-06-01T00:00:00Z");
    const decoded = decodeWatermark(encoded);
    expect(decoded).toBe("999999:2024-06-01T00:00:00Z");
  });

  it("returns null for empty input", () => {
    expect(decodeWatermark("")).toBeNull();
  });

  it("returns null for non-watermark text", () => {
    expect(decodeWatermark("plain text with no zero-width chars")).toBeNull();
  });
});

describe("injectWatermarkIntoHtml", () => {
  it("adds print protection styles", () => {
    const { html } = injectWatermarkIntoHtml("<p>Hello</p>", "Jane Doe", 42);
    expect(html).toContain("@media print{body{display:none!important}}");
  });

  it("adds a visual overlay with teacher name", () => {
    const { html } = injectWatermarkIntoHtml("<p>Hello</p>", "Jane Doe", 42);
    expect(html).toContain("Jane Doe");
    expect(html).toContain("#42");
  });

  it("returns a watermarkHash starting with wm_", () => {
    const { watermarkHash } = injectWatermarkIntoHtml("<p>Hello</p>", "Jane Doe", 42);
    expect(watermarkHash).toMatch(/^wm_42_\d+$/);
  });

  it("escapes HTML in teacher name", () => {
    const { html } = injectWatermarkIntoHtml("<p>Hi</p>", '<script>alert("xss")</script>', 1);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("injects zero-width watermark into first paragraph", () => {
    const input = "<p>Content here</p>";
    const { html } = injectWatermarkIntoHtml(input, "Test", 1);
    // The <p> tag should have zero-width chars injected after it
    expect(html).not.toContain("<p>Content here</p>");
  });
});
