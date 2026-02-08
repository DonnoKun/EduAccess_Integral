/**
 * EduAccess - AI Course Content Generator Edge Function
 * Generates structured educational content with sections, examples,
 * exercises with SHORT answer keys + detailed solutions, and verified sources.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContentRequest {
  title: string;
  description: string;
  contentType: string;
  source: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: ContentRequest = await req.json();
    const { title, description, contentType, source, language = "es" } = body;

    console.log("📚 Generating course content for:", title);
    const startTime = Date.now();

    const langName = language === "es" ? "Spanish" : "English";

    const systemPrompt = `You are an expert educational content creator. Generate comprehensive educational material in ${langName}.

Do NOT use asterisks (*) or markdown formatting - write plain text only.

Generate a COMPLETE educational lesson with:

1. Introduction (3+ paragraphs): What the topic is, why it matters, historical context, what the student will learn, real-world applications.

2. Sections (4-6): Each with 3+ paragraphs of thorough explanation, clear definitions, step-by-step breakdowns, and 5-8 key bullet points.

3. Practical Examples (4-6): Real-world examples with step-by-step walkthroughs. Each 2-3 paragraphs.

4. Exercises (5-8): Practice problems. CRITICAL RULES for exercises:
   - Each exercise MUST have a SPECIFIC, SHORT expected answer (answer_keywords) containing ONLY the key terms/phrases needed (3-15 words max).
   - Each exercise MUST also have a detailed step-by-step solution explaining the reasoning.
   - The answer_keywords should contain the ESSENTIAL concept words that a student must include to be correct.
   - Do NOT use open-ended philosophical questions. Use questions with definitive, verifiable answers.
   - Example: Question: "What is the formula for the area of a circle?" -> answer_keywords: "pi por radio al cuadrado" -> solution: "La formula es A = pi * r^2, donde r es el radio..."

5. Summary (2+ paragraphs)

6. Sources (3-5): ONLY use these verified base URLs:
   - Khan Academy: https://www.khanacademy.org/
   - Wikipedia ES: https://es.wikipedia.org/wiki/[TopicName]
   - Wikipedia EN: https://en.wikipedia.org/wiki/[TopicName]
   - OpenStax: https://openstax.org/
   - MIT OCW: https://ocw.mit.edu/
   - Coursera: https://www.coursera.org/
   Do NOT invent specific page URLs. Use only the base domain or well-known section paths.

The content should be university-level quality, at least 3000 words, written as a comprehensive textbook chapter.`;

    const userPrompt = `Generate a COMPREHENSIVE educational lesson for:
- Title: ${title}
- Description: ${description}
- Content Type: ${contentType}
- Source: ${source}

Write everything in ${langName}. Do NOT use asterisks or markdown formatting.
CRITICAL: For exercises, the answer_keywords field must contain ONLY 3-15 key words that define the correct answer. The solution field has the full explanation.`;

    // Add 90-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

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
          model: "google/gemini-2.5-flash",
          temperature: 0.5,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "course_content",
                description: "Return structured educational course content",
                parameters: {
                  type: "object",
                  properties: {
                    introduction: {
                      type: "string",
                      description: `Detailed introduction (3+ paragraphs) in ${langName}`,
                    },
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          content: { type: "string" },
                          keyPoints: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["title", "content", "keyPoints"],
                        additionalProperties: false,
                      },
                    },
                    examples: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                        },
                        required: ["title", "description"],
                        additionalProperties: false,
                      },
                    },
                    exercises: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: {
                            type: "string",
                            description: `Exercise question in ${langName}`,
                          },
                          hint: {
                            type: "string",
                            description: `Hint to guide the student in ${langName}`,
                          },
                          answer_keywords: {
                            type: "string",
                            description: `SHORT expected answer with ONLY 3-15 key words/phrases that define the correct answer. NOT a full explanation. Example: "pi por radio al cuadrado" or "fotosintesis convierte luz solar en energia quimica"`,
                          },
                          solution: {
                            type: "string",
                            description: `Complete step-by-step solution with full explanation in ${langName}. This is the detailed walkthrough shown to the student.`,
                          },
                        },
                        required: ["question", "hint", "answer_keywords", "solution"],
                        additionalProperties: false,
                      },
                    },
                    summary: {
                      type: "string",
                      description: `Thorough summary (2+ paragraphs) in ${langName}`,
                    },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          url: { type: "string" },
                          description: { type: "string" },
                        },
                        required: ["name", "url", "description"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: [
                    "introduction",
                    "sections",
                    "examples",
                    "exercises",
                    "summary",
                    "sources",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "course_content" },
          },
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
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured course content");
    }

    const courseContent = JSON.parse(toolCall.function.arguments);
    const totalTime = Date.now() - startTime;

    console.log("✅ Course content generated in", totalTime, "ms");

    return new Response(
      JSON.stringify({
        success: true,
        content: courseContent,
        processingTimeMs: totalTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Content generation error:", error);
    
    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(
        JSON.stringify({ success: false, error: "Content generation timed out. Please try again." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
