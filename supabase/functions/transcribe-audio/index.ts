const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { audio, format, lang } = await req.json();
    if (!audio || typeof audio !== "string" || audio.length > 4_000_000) return json({ error: "invalid audio" }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const language = lang === "en" ? "English" : "Spanish";
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Transcribe this short spoken search query (likely ${language}). Reply with ONLY the transcribed words, no quotes or punctuation at the end. If there is no speech, reply with an empty string.` },
            { type: "input_audio", input_audio: { data: audio, format: format || "webm" } },
          ],
        }],
      }),
    });
    if (r.status === 402 || r.status === 429) return json({ error: r.status === 402 ? "credits" : "rate" }, r.status);
    if (!r.ok) { console.error("gateway", r.status, await r.text()); return json({ error: "gateway" }, 500); }
    const d = await r.json();
    const text = String(d.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["'.]$/g, "");
    return json({ text });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
