/** S5 content-delivery: formats remediated content for a modality in the user's language. */
import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { admin, resilientChat } from "../_shared/ai-gateway.ts";
import { z } from "../_shared/validate.ts";

const Body = z.object({
  jobId: z.string().uuid().optional(),
  content: z.object({ title: z.string().min(1).max(500), body: z.string().max(50000) }).optional(),
  modality: z.enum(["text", "audio_script", "html"]),
  language: z.enum(["es", "en"]).default("es"),
}).refine((b) => b.jobId || b.content, { message: "jobId or content required" });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(aiEndpoint(Body, async ({ data, userId, cors }) => {
  let title = data.content?.title ?? "", body = data.content?.body ?? "";
  if (data.jobId) {
    const { data: job } = await admin().from("remediation_jobs").select("payload,result,status,user_id").eq("id", data.jobId).maybeSingle();
    if (!job || job.user_id !== userId) return jsonRes(cors, { success: false, error: "Not found" }, 404);
    if (job.status !== "done") return jsonRes(cors, { success: false, error: "Job not finished", status: job.status }, 409);
    const p = job.payload as Record<string, string>;
    title = p.title ?? ""; body = JSON.stringify(job.result ?? {}) + "\n" + (p.description ?? "");
  }
  const lang = data.language === "es" ? "Spanish" : "English";
  if (data.modality === "html" && !data.jobId) {
    const paras = body.split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join("");
    return jsonRes(cors, { success: true, modality: "html", language: data.language, output: `<article lang="${data.language}"><h1>${esc(title)}</h1>${paras}</article>`, _meta: { path: "local" } });
  }
  const goal = { text: "clear plain-language text with short paragraphs", audio_script: "a text-to-speech script: expand abbreviations, read symbols and numbers aloud, no markup", html: "semantic accessible HTML (article, h1-h3, p, ul, figure with alt) with lang attribute, no scripts or styles" }[data.modality];
  const r = await resilientChat("content-delivery", {
    messages: [{ role: "system", content: `Rewrite the educational content as ${goal}. Output only the result, in ${lang}.` },
      { role: "user", content: JSON.stringify({ title, body: body.slice(0, 30000) }) }],
  }, { cacheKey: { title, body, m: data.modality, l: data.language } });
  if (r.path === "failed") return jsonRes(cors, { success: false, error: "AI unavailable" }, 503);
  return jsonRes(cors, { success: true, modality: data.modality, language: data.language, output: r.data.choices?.[0]?.message?.content ?? "", _meta: { path: r.path, provider: r.provider, degraded: r.degraded } });
}));
