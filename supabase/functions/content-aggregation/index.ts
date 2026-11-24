/** S1 content-aggregation: normalizes a content source (URL, LMS reference or pasted text). */
import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { resilientChat } from "../_shared/ai-gateway.ts";
import { z } from "../_shared/validate.ts";

const Body = z.object({
  sourceType: z.enum(["url", "lms", "text"]),
  value: z.string().min(1).max(50000),
  title: z.string().max(500).optional(),
  language: z.enum(["es", "en"]).default("es"),
});

Deno.serve(aiEndpoint(Body, async ({ data, cors }) => {
  const { sourceType, value, title, language } = data;
  if (sourceType === "url" && !/^https?:\/\//i.test(value)) return jsonRes(cors, { success: false, error: "Invalid URL" }, 400);
  let text = sourceType === "text" ? value : "";
  if (sourceType === "url") {
    try {
      const r = await fetch(value, { signal: AbortSignal.timeout(8000) });
      const html = (await r.text()).slice(0, 300000);
      text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 20000);
    } catch { return jsonRes(cors, { success: false, error: "Source unreachable" }, 502); }
  }
  const r = await resilientChat("content-aggregation", {
    messages: [
      { role: "system", content: `Normalize educational content into a structured object. Respond in ${language === "es" ? "Spanish" : "English"}. Use the tool.` },
      { role: "user", content: JSON.stringify({ sourceType, reference: sourceType === "text" ? undefined : value, title, text: text.slice(0, 20000) }) },
    ],
    tools: [{ type: "function", function: { name: "result", parameters: { type: "object", properties: {
      title: { type: "string" }, summary: { type: "string" }, contentType: { type: "string" }, level: { type: "string" },
      body: { type: "string" }, keywords: { type: "array", items: { type: "string" } } }, required: ["title", "summary", "contentType", "body"] } } }],
    tool_choice: { type: "function", function: { name: "result" } },
  }, { cacheKey: { sourceType, value, title, language } });
  if (r.path === "failed") return jsonRes(cors, { success: false, error: "AI unavailable" }, 503);
  const args = r.data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  return jsonRes(cors, { success: true, content: { ...(args ? JSON.parse(args) : {}), source: { type: sourceType, reference: sourceType === "text" ? null : value }, language },
    _meta: { path: r.path, provider: r.provider, degraded: r.degraded } });
}));
