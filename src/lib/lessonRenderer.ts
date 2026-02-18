import { marked } from "marked";

export type BlockType =
  | "text"
  | "image"
  | "video"
  | "activity"
  | "quiz"
  | string;

export interface LessonBlock {
  id: string;
  lesson_id: string;
  block_type: BlockType;
  content: string | Record<string, unknown> | null;
  sort_order: number;
  [key: string]: unknown;
}

function sanitizeHtml(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

function markdownToHtmlSync(md: string): string {
  if (!md || typeof md !== "string") return "";
  try {
    const raw = marked.parse(md) as string;
    return sanitizeHtml(raw ?? "");
  } catch {
    return "";
  }
}

function renderBlock(block: LessonBlock, signedUrlMap?: Map<string, string>): string {
  const type = block.block_type;
  const content = block.content;

  if (type === "text") {
    const text = typeof content === "string" ? content : (content && typeof (content as any).markdown === "string" ? (content as any).markdown : "");
    return `<div class="lesson-block lesson-block-text">${markdownToHtmlSync(text)}</div>`;
  }

  if (type === "image") {
    const data = content && typeof content === "object" && content !== null ? content as { storage_key?: string; url?: string; alt?: string } : {};
    const storageKey = data.storage_key;
    const url = signedUrlMap && storageKey ? signedUrlMap.get(storageKey) : null;
    const src = url || (typeof data.url === "string" ? data.url : "") || "#";
    const alt = (typeof data.alt === "string" ? data.alt : "") || "Image";
    return `<div class="lesson-block lesson-block-image"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" /></div>`;
  }

  if (type === "video") {
    const data = content && typeof content === "object" && content !== null ? content as { storage_key?: string; url?: string; embed_url?: string; caption?: string } : {};
    const storageKey = data.storage_key;
    const url = signedUrlMap && storageKey ? signedUrlMap.get(storageKey) : null;
    const src = url || (typeof data.embed_url === "string" ? data.embed_url : null) || (typeof data.url === "string" ? data.url : "") || "#";
    const caption = (typeof data.caption === "string" ? data.caption : "") || "";
    return `<div class="lesson-block lesson-block-video"><video src="${escapeAttr(src)}" controls preload="metadata"></video>${caption ? `<p class="video-caption">${escapeHtml(caption)}</p>` : ""}</div>`;
  }

  if (type === "activity" || type === "quiz") {
    let text = "";
    if (typeof content === "string") text = content;
    else if (content && typeof (content as Record<string, unknown>).instructions === "string") text = (content as Record<string, string>).instructions;
    else if (content && typeof (content as Record<string, unknown>).markdown === "string") text = (content as Record<string, string>).markdown;
    return `<div class="lesson-block lesson-block-${type}">${markdownToHtmlSync(text)}</div>`;
  }

  const text = typeof content === "string" ? content : "";
  return `<div class="lesson-block">${markdownToHtmlSync(text)}</div>`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderLessonBlocks(
  blocks: LessonBlock[],
  signedUrlMap?: Map<string, string>
): string {
  const sorted = [...blocks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return sorted.map((b) => renderBlock(b, signedUrlMap)).join("\n");
}
