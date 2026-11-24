/** S3 student microservices: alt-text, data-image-description, ocr-tts, wcag-verify. */
import { resilientChat } from "./ai-gateway.ts";
import { z } from "./validate.ts";

export const Input = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).default(""),
  imageUrl: z.string().url().max(2000).optional(),
  html: z.string().max(200000).optional(),
  language: z.enum(["es", "en"]).default("es"),
});
export type MsInput = z.infer<typeof Input>;

async function structured(fn: string, system: string, user: unknown, schema: Record<string, unknown>, lang: string) {
  const content: unknown[] = [{ type: "text", text: typeof user === "string" ? user : JSON.stringify(user) }];
  const r = await resilientChat(fn, {
    messages: [{ role: "system", content: `${system}\nRespond in ${lang === "es" ? "Spanish" : "English"}. Use the provided tool.` }, { role: "user", content }],
    tools: [{ type: "function", function: { name: "result", description: "Structured result", parameters: { type: "object", ...schema } } }],
    tool_choice: { type: "function", function: { name: "result" } },
  }, { cacheKey: { fn, user, lang } });
  if (r.path === "failed") throw Object.assign(new Error(`${fn} unavailable`), { status: 503 });
  const args = r.data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  return { ...(args ? JSON.parse(args) : {}), _meta: { path: r.path, provider: r.provider, degraded: r.degraded } };
}

export const altText = (i: MsInput) => structured("alt-text",
  "Generate concise WCAG-compliant alt text (max 125 chars) and a long description for the main image(s) of this educational content.",
  { title: i.title, description: i.description, imageUrl: i.imageUrl },
  { properties: { altText: { type: "string" }, longDescription: { type: "string" } }, required: ["altText", "longDescription"] }, i.language);

export const dataImageDescription = (i: MsInput) => structured("data-image-description",
  "Describe charts, diagrams and data images for blind readers: chart type, axes, key values, trends and the main takeaway.",
  { title: i.title, description: i.description, imageUrl: i.imageUrl },
  { properties: { chartType: { type: "string" }, summary: { type: "string" }, dataPoints: { type: "array", items: { type: "string" } } }, required: ["chartType", "summary", "dataPoints"] }, i.language);

export const ocrTts = (i: MsInput) => structured("ocr-tts",
  "Extract the text likely present in images of this content (OCR) and prepare it as a clean script for text-to-speech (expand abbreviations, read symbols).",
  { title: i.title, description: i.description, imageUrl: i.imageUrl },
  { properties: { extractedText: { type: "string" }, ttsScript: { type: "string" } }, required: ["extractedText", "ttsScript"] }, i.language);

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
