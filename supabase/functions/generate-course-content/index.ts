/**
 * EduAccess - AI Course Content Generator Edge Function
 * Generates deep, structured educational content with sections, examples, exercises with solutions,
 * and source references for credibility.
 * Uses Lovable AI Gateway (Gemini)
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

    const systemPrompt = `You are an expert educational content creator and university-level instructor. You create comprehensive, in-depth educational material that helps students truly understand complex topics.

You MUST write ALL content entirely in ${langName}.

Given a topic title and description, generate a COMPLETE, COMPREHENSIVE educational lesson that includes:

1. **Introduction**: An engaging, detailed introduction (at least 3 paragraphs) explaining:
   - What the topic is and why it matters
   - Historical context or background
   - What the student will learn by the end
   - Prerequisites or related knowledge

2. **Sections (3-5 sections)**: Each section must be THOROUGH and DETAILED:
   - At least 2-3 substantial paragraphs of explanation per section
   - Clear definitions of all technical terms
   - Step-by-step breakdowns of complex concepts
   - Connections between concepts
   - 4-6 key bullet points summarizing the section

3. **Practical Examples (3-4)**: Real-world, concrete examples with:
   - Detailed step-by-step walkthroughs
   - Mathematical formulas or code when applicable
   - Visual descriptions of processes
   - Each example should be at least 2 paragraphs

4. **Exercises (3-4)**: Practice problems WITH COMPLETE SOLUTIONS:
   - Clear problem statement
   - A hint to guide the student
   - A COMPLETE, step-by-step solution explaining the answer
   - These must be solvable exercises, not open-ended questions

5. **Summary**: A thorough summary (2+ paragraphs) of all key takeaways

6. **Sources**: 3-5 credible academic/educational sources where this information can be verified:
   - Include the source name, URL, and a brief description of what it covers
   - Prefer: Khan Academy, Wikipedia, OpenStax, MIT OpenCourseWare, Coursera, university resources
   - These should be REAL, verifiable URLs

The content should be:
- University-level quality but accessible
- Deeply educational, not surface-level
- Include mathematical notation where relevant (use plain text like x^2, sqrt(x), etc.)
- At least 2000 words total
- Written as if for a comprehensive textbook chapter

You MUST use the provided tool to return structured content.`;

    const userPrompt = `Generate a COMPREHENSIVE, IN-DEPTH educational lesson for:
- Title: ${title}
- Description: ${description}
- Content Type: ${contentType}
- Source: ${source}

This must be university-level quality content with deep explanations, worked examples, solvable exercises with full solutions, and real source references. Write everything in ${langName}. Make it thorough enough that a student could learn the topic from this lesson alone.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
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
                          title: {
                            type: "string",
                            description: `Section title in ${langName}`,
                          },
                          content: {
                            type: "string",
                            description: `Detailed multi-paragraph explanation in ${langName}. At least 2-3 paragraphs.`,
                          },
                          keyPoints: {
                            type: "array",
                            items: { type: "string" },
                            description: `4-6 key bullet points in ${langName}`,
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
                          title: {
                            type: "string",
                            description: `Example title in ${langName}`,
                          },
                          description: {
                            type: "string",
                            description: `Detailed step-by-step example (2+ paragraphs) in ${langName}`,
                          },
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
                          answer: {
                            type: "string",
                            description: `Complete step-by-step solution in ${langName}`,
                          },
                        },
                        required: ["question", "hint", "answer"],
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
                          name: {
                            type: "string",
                            description: "Source name (e.g., Khan Academy, Wikipedia)",
                          },
                          url: {
                            type: "string",
                            description: "URL of the source",
                          },
                          description: {
                            type: "string",
                            description: `Brief description of what this source covers, in ${langName}`,
                          },
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
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
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Content generation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
