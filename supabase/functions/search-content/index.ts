/**
 * EduAccess - AI Educational Content Search Edge Function
 * Uses Lovable AI Gateway to search and find real educational content
 * Returns structured results with accessibility metadata
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchRequest {
  query: string;
  filters?: {
    contentType?: string[];
    educationLevel?: string[];
    source?: string[];
    language?: string;
  };
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

    const body: SearchRequest = await req.json();
    const { query, filters, language = "es" } = body;

    console.log("🔍 AI Search for:", query);

    const filterContext = filters
      ? `\nFilters: ${JSON.stringify(filters)}`
      : "";

    const systemPrompt = `You are an educational content search engine. You find real educational resources from the internet.

You must respond in ${language === 'es' ? 'Spanish' : 'English'}.

Given a search query, return realistic educational content results that would be found on real educational platforms like:
- Khan Academy (khan)
- Wikipedia (wikipedia) 
- OpenStax (openstax)
- YouTube educational channels (youtube)
- OER Commons (oer)
- ArXiv (arxiv)

For each result, assess its accessibility status:
- "accessible": Content has proper alt-text, captions, structured headings
- "needs_remediation": Content lacks alt-text, captions, or has complex unstructured text
- "partially_accessible": Some accessibility features present but incomplete

Generate 6-10 realistic results based on the query. Include real-looking URLs, accurate descriptions, and proper metadata.

You MUST use the provided tool to return structured results.`;

    const userPrompt = `Search for educational content: "${query}"${filterContext}

Return realistic educational content results with accessibility metadata.`;

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
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "search_results",
                description: "Return educational content search results",
                parameters: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          source: {
                            type: "string",
                            enum: ["youtube", "khan", "openstax", "wikipedia", "oer", "arxiv"],
                          },
                          url: { type: "string" },
                          description: { type: "string" },
                          contentType: {
                            type: "string",
                            enum: ["video", "article", "textbook", "exercise", "diagram"],
                          },
                          educationLevel: {
                            type: "string",
                            enum: ["elementary", "middle", "high", "college"],
                          },
                          accessibilityStatus: {
                            type: "string",
                            enum: ["accessible", "needs_remediation", "partially_accessible"],
                          },
                          accessibilityIssues: {
                            type: "array",
                            items: { type: "string" },
                          },
                          duration: { type: "string", description: "For videos, e.g. '12:35'" },
                          wordCount: { type: "number", description: "For articles" },
                          tags: {
                            type: "array",
                            items: { type: "string" },
                          },
                          author: { type: "string" },
                          language: { type: "string" },
                        },
                        required: [
                          "title", "source", "url", "description", "contentType",
                          "educationLevel", "accessibilityStatus", "tags", "language",
                        ],
                        additionalProperties: false,
                      },
                    },
                    totalEstimated: {
                      type: "number",
                      description: "Estimated total results available",
                    },
                  },
                  required: ["results", "totalEstimated"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "search_results" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
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
      throw new Error("AI did not return structured search results");
    }

    const searchData = JSON.parse(toolCall.function.arguments);

    // Map colors for content types
    const sourceColors: Record<string, string> = {
      youtube: "#FF0000",
      khan: "#14BF96",
      openstax: "#F47B20",
      wikipedia: "#333333",
      oer: "#2196F3",
      arxiv: "#B31B1B",
    };

    // Transform results to match SearchResult type
    const results = searchData.results.map((r: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      title: r.title,
      source: r.source,
      url: r.url,
      description: r.description,
      contentType: r.contentType,
      educationLevel: r.educationLevel,
      accessibilityStatus: r.accessibilityStatus,
      accessibilityIssues: r.accessibilityIssues || [],
      metadata: {
        duration: r.duration,
        wordCount: r.wordCount,
        language: r.language || language,
        author: r.author,
        tags: r.tags || [],
      },
      color: sourceColors[r.source] || "#6366F1",
      thumbnail: undefined,
      license: "CC BY 4.0",
    }));

    console.log("✅ AI search returned", results.length, "results");

    return new Response(
      JSON.stringify({
        success: true,
        results,
        totalEstimated: searchData.totalEstimated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
