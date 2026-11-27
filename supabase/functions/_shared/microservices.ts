/** S3 student microservices: alt-text, data-image-description, ocr-tts, wcag-verify. */
import { resilientChat } from "./ai-gateway.ts";
import { z } from "./validate.ts";
import { LOW_VISION_AUDIENCE, visionContent, shortAlt } from './low-vision.ts';

export const Input = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).default(""),
  imageUrl: z.string().max(12000000).refine(v => /^https:\/\//i.test(v) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v), 'Expected HTTPS image or image data URL').optional(),
  html: z.string().max(200000).optional(),
  language: z.enum(["es", "en"]).default("es"),
});
export type MsInput = z.infer<typeof Input>;

async function structured(fn: string, system: string, user: unknown, schema: Record<string, unknown>, lang: string, imageUrl?: string) {
  if (!imageUrl) throw Object.assign(new Error('An actual image is required; metadata cannot establish its contents'), { status: 400 });
  const content = visionContent(user, imageUrl);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(imageUrl));
  const image = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const r = await resilientChat(fn, {
    messages: [{ role: "system", content: `${system}\nAudience: ${LOW_VISION_AUDIENCE}. Describe ONLY what is visible in the supplied image, never infer from its title. If text or values are unreadable, explicitly say so; do not invent them. Respond in ${lang === "es" ? "Spanish" : "English"}. Use the provided tool.` }, { role: "user", content }],
    tools: [{ type: "function", function: { name: "result", description: "Structured result", parameters: { type: "object", ...schema } } }],
    tool_choice: { type: "function", function: { name: "result" } },
  }, { cacheKey: { fn, user, lang, image } });
  if (r.path === "failed") throw Object.assign(new Error(`${fn} unavailable`), { status: 503 });
  const args = r.data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  const result = args ? JSON.parse(args) : {};
  if (typeof result.altText === 'string') result.altText = shortAlt(result.altText);
  return { ...result, _meta: { path: r.path, provider: r.provider, degraded: r.degraded } };
}

export const altText = (i: MsInput) => structured("alt-text",
  "Inspect the actual image. Generate concise alt text (max 125 characters) and a rich long description: overall scene, every significant element, embedded text, colors, positions and relationships. Explain the educational meaning without substituting the title for observation.",
  { title: i.title, description: i.description },
  { properties: { altText: { type: "string", maxLength: 125 }, longDescription: { type: "string" } }, required: ["altText", "longDescription"] }, i.language, i.imageUrl);

export const dataImageDescription = (i: MsInput) => structured("data-image-description",
  "Inspect the actual chart or diagram: chart type, both axes and units, scale, legend, each series and its colors, visible numeric values, comparisons, trends, spatial relationships and takeaway. Transcribe legible data points from the image; never supply guessed values.",
  { title: i.title, description: i.description },
  { properties: { chartType: { type: "string" }, summary: { type: "string" }, dataPoints: { type: "array", items: { type: "string" } } }, required: ["chartType", "summary", "dataPoints"] }, i.language, i.imageUrl);

export const ocrTts = (i: MsInput) => structured("ocr-tts",
  "Read only text actually visible in the image (OCR) and prepare it as a clean script for text-to-speech (expand abbreviations, read symbols). Mark illegible passages rather than guessing.",
  { title: i.title, description: i.description },
  { properties: { extractedText: { type: "string" }, ttsScript: { type: "string" } }, required: ["extractedText", "ttsScript"] }, i.language, i.imageUrl);

/** Deterministic WCAG checks (no AI cost) on HTML when provided. */
export function wcagVerify(i: MsInput) {
  const html = i.html ?? "";
  const issues: { criterion: string; message: string }[] = [];
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  imgs.filter((t) => !/\balt\s*=/.test(t)).forEach(() => issues.push({ criterion: "1.1.1", message: "Image without alt attribute" }));
  if (html && !/<html[^>]*\blang=/i.test(html)) issues.push({ criterion: "3.1.1", message: "Missing page language" });
  if (html && !/<h1\b/i.test(html)) issues.push({ criterion: "1.3.1", message: "No top-level heading" });
  (html.match(/<a\b[^>]*>\s*<\/a>/gi) ?? []).forEach(() => issues.push({ criterion: "2.4.4", message: "Empty link text" }));
  (html.match(/<input\b(?![^>]*\b(aria-label|id)=)[^>]*>/gi) ?? []).forEach(() => issues.push({ criterion: "3.3.2", message: "Input without label" }));
  const checks = Math.max(1, imgs.length + 4);
  return { conformant: issues.length === 0, score: Math.round(100 * (1 - Math.min(issues.length, checks) / checks)), issues, _meta: { path: "primary", provider: "rules", degraded: false } };
}
