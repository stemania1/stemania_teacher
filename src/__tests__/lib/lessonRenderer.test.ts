import { renderLessonBlocks, type LessonBlock } from "@/lib/lessonRenderer";

function makeBlock(overrides: Partial<LessonBlock> & { block_type: string }): LessonBlock {
  return {
    id: "block-1",
    lesson_id: "lesson-1",
    content: null,
    sort_order: 0,
    ...overrides,
  };
}

describe("renderLessonBlocks", () => {
  it("returns empty string for no blocks", () => {
    expect(renderLessonBlocks([])).toBe("");
  });

  it("renders text blocks with markdown", () => {
    const blocks = [makeBlock({ block_type: "text", content: "**bold**" })];
    const html = renderLessonBlocks(blocks);
    expect(html).toContain("lesson-block-text");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("renders text block with content.markdown object form", () => {
    const blocks = [makeBlock({ block_type: "text", content: { markdown: "# Title" } as any })];
    const html = renderLessonBlocks(blocks);
    expect(html).toContain("<h1>");
    expect(html).toContain("Title");
  });

  it("renders image blocks", () => {
    const blocks = [makeBlock({
      block_type: "image",
      content: { url: "https://example.com/img.png", alt: "A test image" } as any,
    })];
    const html = renderLessonBlocks(blocks);
    expect(html).toContain("lesson-block-image");
    expect(html).toContain('src="https://example.com/img.png"');
    expect(html).toContain('alt="A test image"');
  });

  it("uses signed URL for image with storage_key", () => {
    const urlMap = new Map([["images/photo.jpg", "https://signed-url.com/photo"]]);
    const blocks = [makeBlock({
      block_type: "image",
      content: { storage_key: "images/photo.jpg" } as any,
    })];
    const html = renderLessonBlocks(blocks, urlMap);
    expect(html).toContain("https://signed-url.com/photo");
  });

  it("renders video blocks with captions", () => {
    const blocks = [makeBlock({
      block_type: "video",
      content: { url: "https://example.com/vid.mp4", caption: "My video" } as any,
    })];
    const html = renderLessonBlocks(blocks);
    expect(html).toContain("lesson-block-video");
    expect(html).toContain("<video");
    expect(html).toContain("My video");
  });

  it("renders activity blocks", () => {
    const blocks = [makeBlock({ block_type: "activity", content: "Do this activity" })];
    const html = renderLessonBlocks(blocks);
    expect(html).toContain("lesson-block-activity");
  });

  it("renders quiz blocks from instructions field", () => {
    const blocks = [makeBlock({
      block_type: "quiz",
      content: { instructions: "Answer these questions" } as any,
    })];
    const html = renderLessonBlocks(blocks);
    expect(html).toContain("lesson-block-quiz");
    expect(html).toContain("Answer these questions");
  });

  it("renders presentation blocks with slide images", () => {
    const urlMap = new Map([
      ["slides/s1.png", "https://signed.com/s1"],
      ["slides/s2.png", "https://signed.com/s2"],
    ]);
    const blocks = [makeBlock({
      block_type: "presentation",
      content: JSON.stringify({ slides: ["slides/s1.png", "slides/s2.png"] }),
    })];
    const html = renderLessonBlocks(blocks, urlMap);
    expect(html).toContain("lesson-block-presentation");
    expect(html).toContain("Slide 1");
    expect(html).toContain("Slide 2");
  });

  it("shows unavailable message for presentation with no slides", () => {
    const blocks = [makeBlock({
      block_type: "presentation",
      content: JSON.stringify({ slides: [] }),
    })];
    const html = renderLessonBlocks(blocks);
    expect(html).toContain("Presentation slides unavailable");
  });

  it("sorts blocks by sort_order", () => {
    const blocks = [
      makeBlock({ id: "b2", block_type: "text", content: "Second", sort_order: 2 }),
      makeBlock({ id: "b1", block_type: "text", content: "First", sort_order: 1 }),
    ];
    const html = renderLessonBlocks(blocks);
    const firstIdx = html.indexOf("First");
    const secondIdx = html.indexOf("Second");
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("strips script tags from text content", () => {
    const blocks = [makeBlock({
      block_type: "text",
      content: 'Hello <script>alert("xss")</script> world',
    })];
    const html = renderLessonBlocks(blocks);
    expect(html).not.toContain("<script>");
  });

  it("escapes HTML attributes in image src", () => {
    const blocks = [makeBlock({
      block_type: "image",
      content: { url: 'test" onload="alert(1)', alt: "safe" } as any,
    })];
    const html = renderLessonBlocks(blocks);
    // The src attribute value is escaped — the raw " is turned into &quot;
    expect(html).toContain("&quot;");
    expect(html).not.toContain('onload="alert');
  });

  it("falls back to generic block for unknown types", () => {
    const blocks = [makeBlock({ block_type: "custom_widget", content: "some text" })];
    const html = renderLessonBlocks(blocks);
    expect(html).toContain('class="lesson-block"');
  });
});
