import { requireUser } from "../_shared/require-user.ts";
/**
 * EduAccess - AI Educational Content Search Edge Function
 * Two-step approach:
 *  1. Classify the query to determine if it's a real educational topic
 *  2. Only return results the AI is confident actually exist
 * 
 * NEVER fabricates content about unknown people or topics.
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

  const authError = await requireUser(req, corsHeaders);
  if (authError) return authError;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: SearchRequest = await req.json();
    const { query, filters, language = "es" } = body;

    console.log("🔍 AI Search for:", query, "language:", language);

    const filterContext = filters
      ? `\nFilters applied: ${JSON.stringify(filters)}`
      : "";

    const langName = language === "es" ? "Spanish" : "English";

    // ── SINGLE-STEP PROMPT WITH STRICT ANTI-HALLUCINATION RULES ──
    const systemPrompt = `You are a STRICT educational content search engine. Your job is to find REAL, VERIFIABLE educational resources that actually exist on the internet.

RESPOND ENTIRELY IN ${langName}.

## CRITICAL RULES — READ CAREFULLY

1. **NEVER INVENT CONTENT.** Every result you return MUST correspond to a real page/video that actually exists on the referenced platform. If you are not confident a resource exists, DO NOT include it.

2. **PERSONAL NAMES / UNKNOWN ENTITIES:** If the user searches for a person's name (e.g. "Juan Pérez García") and that person is NOT a widely-known public figure with verifiable educational content (like Einstein, Shakespeare, Frida Kahlo, etc.), you MUST:
   - Return ZERO results
   - Provide 3-5 suggested alternative searches on related EDUCATIONAL topics
   - Example: if someone searches "María López Hernández", suggest topics like "Introducción a la Biología", "Historia de México", "Matemáticas básicas"

3. **QUERY CLASSIFICATION:** Before searching, classify the query:
   - "educational_topic": A real academic subject, scientific concept, historical event, etc. → Search for real content
   - "known_figure": A widely-known person with verifiable educational content → Search for real content about them
   - "unknown_entity": A person or entity you cannot verify has real educational content → Return 0 results + suggestions
   - "nonsense": Random text, gibberish, or non-educational queries → Return 0 results + suggestions
   - "general": Empty or very generic query → Return popular educational content

4. **REAL SOURCES ONLY:** Only reference content from these platforms that you are CONFIDENT actually exists:
   - Khan Academy (khan) — e.g. "Álgebra lineal", "Biología celular"
   - Wikipedia (wikipedia) — articles you know exist (e.g. "es.wikipedia.org/wiki/Fotosíntesis")
   - OpenStax (openstax) — real textbooks (e.g. "Física universitaria")
   - YouTube educational (youtube) — well-known educational channels (e.g. CrashCourse, 3Blue1Brown, Unicoos)
   - OER Commons (oer) — real open educational resources
   - ArXiv (arxiv) — real academic papers

5. **URL RULES:** 
   - For Wikipedia, use REAL article URLs: "https://es.wikipedia.org/wiki/[Real_Article_Name]"
   - For Khan Academy, use: "https://es.khanacademy.org/..." with real course paths
   - For YouTube, use "https://www.youtube.com/results?search_query=[topic]" if you don't know the exact video ID
   - NEVER fabricate specific video IDs or article URLs you're unsure about

6. **RESULT COUNT:** Return between 0 and 6 results. Quality over quantity. It is BETTER to return 2 real results than 6 fabricated ones.`;

    const defaultQuery =
      language === "es"
        ? "contenido educativo general variado"
        : "general educational content";
    const searchQuery = query?.trim() || defaultQuery;

    const userPrompt = `Search for educational resources about: "${searchQuery}"${filterContext}

First, classify this query, then return results accordingly. Remember: NEVER invent content. If unsure, return 0 results with suggestions.`;

    // 30-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          temperature: 0.1, // Very low temperature for factual accuracy
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "search_results",
                description:
                  "Return educational content search results. Return 0 results with suggestions if the query is about an unknown person or non-educational topic.",
                parameters: {
                  type: "object",
                  properties: {
                    queryClassification: {
                      type: "string",
                      enum: [
                        "educational_topic",
                        "known_figure",
                        "unknown_entity",
                        "nonsense",
                        "general",
                      ],
                      description:
                        "Classification of the user query. Use 'unknown_entity' for people/things you cannot verify.",
                    },
                    results: {
                      type: "array",
                      description:
                        "Array of REAL, VERIFIABLE educational resources. Can be empty (0 items) if no real content exists for this query.",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          source: {
                            type: "string",
                            enum: [
                              "youtube",
                              "khan",
                              "openstax",
                              "wikipedia",
                              "oer",
                              "arxiv",
                            ],
                          },
                          url: {
                            type: "string",
                            description:
                              "A REAL URL that actually exists. Use search URLs if unsure of exact page.",
                          },
                          description: { type: "string" },
                          contentType: {
                            type: "string",
                            enum: [
                              "video",
                              "article",
                              "textbook",
                              "exercise",
                              "diagram",
                            ],
                          },
                          educationLevel: {
                            type: "string",
                            enum: [
                              "elementary",
                              "middle",
                              "high",
                              "college",
                            ],
                          },
                          accessibilityStatus: {
                            type: "string",
                            enum: [
                              "accessible",
                              "needs_remediation",
                              "partially_accessible",
                            ],
                          },
                          accessibilityIssues: {
                            type: "array",
                            items: { type: "string" },
                          },
                          duration: { type: "string" },
                          wordCount: { type: "number" },
                          tags: { type: "array", items: { type: "string" } },
                          author: { type: "string" },
                          language: { type: "string" },
                        },
                        required: [
                          "title",
                          "source",
                          "url",
                          "description",
                          "contentType",
                          "educationLevel",
                          "accessibilityStatus",
                          "tags",
                          "language",
                        ],
                        additionalProperties: false,
                      },
                    },
                    suggestions: {
                      type: "array",
                      description:
                        "Alternative educational search suggestions when no results are found. Provide 3-5 real educational topics the user could search for instead.",
                      items: { type: "string" },
                    },
                    noResultsReason: {
                      type: "string",
                      description:
                        "Brief user-friendly explanation of why no results were found. Only required when results array is empty.",
                    },
                    totalEstimated: { type: "number" },
                  },
                  required: [
                    "queryClassification",
                    "results",
                    "totalEstimated",
                  ],
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

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Rate limit / credits: respond 200 with success:false so the client
      // falls back to its local results instead of crashing on a non-2xx.
      if (response.status === 429 || response.status === 402) {
        const reason =
          response.status === 402 ? "credits_exhausted" : "rate_limited";
        console.warn("AI search unavailable:", reason);
        return new Response(
          JSON.stringify({ success: false, error: reason, aiUnavailable: true }),
          {
            status: 200,
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
      console.error(
        "No tool call in response:",
        JSON.stringify(aiResponse.choices?.[0]?.message).slice(0, 300)
      );
      throw new Error("AI did not return structured search results");
    }

    const rawArgs = toolCall.function.arguments;
    const searchData =
      typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;

    console.log(
      "📊 Query classification:",
      searchData.queryClassification,
      "| Results:",
      searchData.results?.length || 0,
      "| Suggestions:",
      searchData.suggestions?.length || 0
    );

    const sourceColors: Record<string, string> = {
      youtube: "#FF0000",
      khan: "#14BF96",
      openstax: "#F47B20",
      wikipedia: "#333333",
      oer: "#2196F3",
      arxiv: "#B31B1B",
    };

    const results = (searchData.results || []).map(
      (r: any, index: number) => ({
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
      })
    );

    console.log("✅ AI search returned", results.length, "results");

    return new Response(
      JSON.stringify({
        success: true,
        results,
        totalEstimated: searchData.totalEstimated || results.length,
        queryClassification: searchData.queryClassification,
        suggestions: searchData.suggestions || [],
        noResultsReason: searchData.noResultsReason || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Search timed out. Please try again.",
        }),
        {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
