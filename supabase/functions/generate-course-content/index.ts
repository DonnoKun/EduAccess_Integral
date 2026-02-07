/**
 * EduAccess - AI Course Content Generator Edge Function
 * Generates structured educational content with sections, examples, and exercises
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

    const langName = language === 'es' ? 'Spanish' : 'English';

    const systemPrompt = `You are an expert educational content creator. You generate high-quality, structured educational content for students.

You MUST write ALL content entirely in ${langName}.

Given a topic title and description, generate a COMPLETE educational lesson that includes:
1. An engaging introduction that explains the topic and why it matters
2. 2-4 concept sections with detailed, clear explanations suitable for the education level
3. Practical, real-world examples that illustrate the concepts
4. 2-3 practice exercises or review questions for the student to test understanding
5. A concise summary of key takeaways

The content should be:
- Educationally rigorous but accessible
- Well-structured with clear headings
- Engaging and student-friendly
- Include key points/bullet points for each section
- Appropriate for the content type (textbook-style for textbooks, lesson-style for courses, etc.)

You MUST use the provided tool to return structured content.`;

    const userPrompt = `Generate a complete educational lesson for:
- Title: ${title}
- Description: ${description}
- Content Type: ${contentType}
- Source: ${source}

Create detailed, educational content with theory, examples, and exercises. Write everything in ${langName}.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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
                      description: `Engaging introduction to the topic in ${langName}`,
                    },
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: `Section title in ${langName}` },
                          content: { type: "string", description: `Detailed explanation in ${langName}` },
                          keyPoints: {
                            type: "array",
                            items: { type: "string" },
                            description: `Key bullet points in ${langName}`,
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
                          title: { type: "string", description: `Example title in ${langName}` },
                          description: { type: "string", description: `Example explanation in ${langName}` },
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
                          question: { type: "string", description: `Exercise question in ${langName}` },
                          hint: { type: "string", description: `Optional hint in ${langName}` },
                        },
                        required: ["question"],
                        additionalProperties: false,
                      },
                    },
                    summary: {
                      type: "string",
                      description: `Brief summary of key takeaways in ${langName}`,
                    },
                  },
                  required: ["introduction", "sections", "examples", "exercises", "summary"],
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
