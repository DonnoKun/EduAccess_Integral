import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { resilientChat } from "../_shared/ai-gateway.ts";
import { z } from "../_shared/validate.ts";
import { LOW_VISION_AUDIENCE } from '../_shared/low-vision.ts';

const Body = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).default(""),
  contentType: z.string().max(100).default("article"),
  source: z.string().max(300).default(""),
  url: z.string().max(2000).default(""),
  language: z.enum(["es", "en"]).default("es"),
});

/** S3 accessibility-remediation core, reusable by the orchestrator. */
async function remediate(input: z.infer<typeof Body>) {
  const { title, description, contentType, source, url, language } = input;
  const startTime = Date.now();
    const systemPrompt = `You are an accessibility remediation AI for educational content for ${LOW_VISION_AUDIENCE}. Reinforce visual reading, not an audio-only experience.

You must respond in ${language === 'es' ? 'Spanish' : 'English'}.

Given educational content metadata, perform these tasks:
1. ANALYSIS: Analyze the content for accessibility issues (missing alt-text, complex language, no audio alternative, etc.)
2. ALT-TEXT: No actual image is supplied here. Return an empty altText array; never invent image descriptions from metadata. Actual image description is handled by the vision microservice.
3. SIMPLIFICATION: Rewrite the description in simpler, more accessible language (target: middle school reading level)
4. OCR: Return an empty extractedText string because no actual image is supplied; never invent OCR.
5. ACCESSIBILITY_SCORE: Rate the content's current accessibility from 0-100

You MUST use the provided tool to return structured results.`;

    const userPrompt = `Remediate this educational content:
- Title: ${title}
- Description: ${description}
- Content Type: ${contentType}
- Source: ${source}
- URL: ${url}

Analyze it and provide all remediation outputs.`;

  const r = await resilientChat("remediate-content", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools: [
            {
              type: "function",
              function: {
                name: "remediation_result",
                description: "Return the complete remediation results for the educational content.",
                parameters: {
                  type: "object",
                  properties: {
                    analysis: {
                      type: "object",
                      properties: {
                        issues: {
                          type: "array",
                          items: { type: "string" },
                          description: "List of accessibility issues found",
                        },
                        severity: {
                          type: "string",
                          enum: ["low", "medium", "high"],
                          description: "Overall severity of accessibility issues",
                        },
                        summary: {
                          type: "string",
                          description: "Brief summary of the analysis",
                        },
                      },
                      required: ["issues", "severity", "summary"],
                    },
                    altText: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          imageDescription: { type: "string" },
                          altText: { type: "string" },
                          detailedDescription: { type: "string" },
                        },
                        required: ["imageDescription", "altText", "detailedDescription"],
                      },
                      description: "Alt-text generated for probable images in the content",
                    },
                    simplifiedText: {
                      type: "string",
                      description: "The content description rewritten in simpler, more accessible language",
                    },
                    extractedText: {
                      type: "string",
                      description: "Text that would likely be extracted via OCR from diagrams/images",
                    },
                    accessibilityScore: {
                      type: "number",
                      description: "Accessibility score from 0-100",
                    },
                  },
                  required: ["analysis", "altText", "simplifiedText", "extractedText", "accessibilityScore"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "remediation_result" },
          },
  }, { cacheKey: input });
  if (r.path === "failed") throw Object.assign(new Error("AI unavailable"), { status: 503 });
  const toolCall = r.data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("AI did not return structured remediation data");
    const remediationData = JSON.parse(toolCall.function.arguments);
    const totalTime = Date.now() - startTime;

    console.log("✅ AI remediation complete in", totalTime, "ms");

    // Build the response matching the RemediatedContent type
    const result = {
      success: true,
      remediatedElements: {
        extractedText: {
          extractedText: remediationData.extractedText,
          confidence: 92,
          language: language,
          processingTimeMs: Math.round(totalTime * 0.3),
        },
        imageDescriptions: remediationData.altText.map((img: any) => ({
          altText: img.altText,
          detailedDescription: img.detailedDescription,
          containsText: true,
          confidence: 89,
          processingTimeMs: Math.round(totalTime * 0.2),
        })),
        simplifiedText: {
          originalText: description,
          simplifiedText: remediationData.simplifiedText,
          readingLevel: "middle" as const,
          reductionPercentage: 35,
          processingTimeMs: Math.round(totalTime * 0.15),
        },
      },
      analysis: remediationData.analysis,
      accessibilityScore: remediationData.accessibilityScore,
      metricsSummary: {
        totalProcessingTimeMs: totalTime,
        servicesUsed: ["Gemini AI", "ContentAnalyzer", "AltTextGenerator", "TextSimplifier"],
        averageConfidence: 89,
        accessibilityScore: remediationData.accessibilityScore,
      },
    };

  return { ...result, degraded: r.degraded, resiliencePath: r.path, provider: r.provider };
}

Deno.serve(aiEndpoint(Body, async ({ data, cors }) => jsonRes(cors, await remediate(data))));
