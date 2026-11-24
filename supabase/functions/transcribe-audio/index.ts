import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { resilientChat } from "../_shared/ai-gateway.ts";
import { z } from "../_shared/validate.ts";

const Body = z.object({ audio: z.string().min(1).max(4_000_000), format: z.enum(["webm", "mp4", "ogg", "wav", "mp3"]).default("webm"), lang: z.enum(["es", "en"]).default("es") });

Deno.serve(aiEndpoint(Body, async ({ data, cors }) => {
  const language = data.lang === "en" ? "English" : "Spanish";
  // No secondary: audio input is only supported by the primary family; cache still applies.
  const r = await resilientChat("transcribe-audio", {
    temperature: 0,
    messages: [{ role: "user", content: [
      { type: "text", text: `Transcribe this short spoken search query (likely ${language}). Reply with ONLY the transcribed words, no quotes or punctuation at the end. If there is no speech, reply with an empty string.` },
      { type: "input_audio", input_audio: { data: data.audio, format: data.format } },
    ] }],
  }, { primary: "google/gemini-3.8-flash", secondary: null });
  if (r.path === "failed") return jsonRes(cors, { error: "gateway" }, 503);
  const text = String(r.data.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["'.]$/g, "");
  return jsonRes(cors, { text, degraded: r.degraded, path: r.path });
}, { maxBytes: 4_200_000 }));
