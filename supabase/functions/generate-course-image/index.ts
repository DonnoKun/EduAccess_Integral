/**
 * EduAccess - AI Course Image Generator Edge Function
 * Generates educational illustrations using Lovable AI image generation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { prompt, alt, sectionTitle, sectionContext } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🎨 Generating course image:", prompt.slice(0, 80));

    // Build a highly specific prompt using section context
    const contextClue = sectionTitle
      ? `The image is for a section titled "${sectionTitle}".`
      : "";
    const contentClue = sectionContext
      ? `The section covers: ${sectionContext.slice(0, 300)}.`
      : "";

    const fullPrompt = [
      "Generate a precise, educational illustration for a textbook.",
      "Style: modern flat illustration with clear colors, labeled diagrams where relevant, educational and accessible.",
      "IMPORTANT: The illustration must accurately depict the specific topic described below. Do NOT add unrelated elements.",
      "Do NOT include any text overlays or watermarks.",
      contextClue,
      contentClue,
      `Specific subject to illustrate: ${prompt}`,
    ]
      .filter(Boolean)
      .join(" ");

    // 45-second timeout for image generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: fullPrompt,
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    const imageUrl =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.warn("No image returned from AI");
      return new Response(
        JSON.stringify({ success: false, error: "No image generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Course image generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        alt: alt || prompt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Image generation error:", error);

    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(
        JSON.stringify({ success: false, error: "Image generation timed out" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
