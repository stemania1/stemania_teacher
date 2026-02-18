const ZERO_WIDTH_CHARS = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
const SEPARATOR = ZERO_WIDTH_CHARS[2];

export function encodeWatermark(employeeNumber: number, timestamp: string): string {
  const payload = `${employeeNumber}:${timestamp}`;
  return payload
    .split("")
    .map((c) => {
      const binary = c.charCodeAt(0).toString(2).padStart(8, "0");
      return binary
        .split("")
        .map((bit) => ZERO_WIDTH_CHARS[parseInt(bit, 10)])
        .join("");
    })
    .join(SEPARATOR);
}

export function decodeWatermark(text: string): string | null {
  const charToBit = Object.fromEntries(
    ZERO_WIDTH_CHARS.map((c, i) => [c, i])
  ) as Record<string, number>;
  const parts: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunk: number[] = [];
    while (i < text.length) {
      const ch = text[i];
      if (ch === SEPARATOR) {
        i += 1;
        break;
      }
      const bit = charToBit[ch];
      if (bit === undefined) {
        i += 1;
        continue;
      }
      chunk.push(bit);
      i += 1;
    }
    if (chunk.length === 8) {
      const code = parseInt(chunk.join(""), 2);
      parts.push(String.fromCharCode(code));
    }
  }
  if (parts.length === 0) return null;
  return parts.join("");
}

export function injectWatermarkIntoHtml(
  html: string,
  teacherName: string,
  employeeNumber: number
): { html: string; watermarkHash: string } {
  const timestamp = new Date().toISOString();
  const encoded = encodeWatermark(employeeNumber, timestamp);
  const watermarkHash = `wm_${employeeNumber}_${Date.now()}`;

  html = html.replace(/<p>/, `<p>${encoded}`);
  const overlay = `<div style="position:fixed;bottom:0;right:0;opacity:0.03;font-size:10px;pointer-events:none;z-index:9999;transform:rotate(-45deg)">${escapeHtml(teacherName)} · #${employeeNumber}</div>`;
  const protection = `<style>@media print{body{display:none!important}}img{pointer-events:none;-webkit-user-drag:none}</style>`;

  return { html: protection + html + overlay, watermarkHash };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
