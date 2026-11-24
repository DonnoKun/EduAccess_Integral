/** S2 visual-profiling: reads/writes the signed-in user's visual accessibility profile. No AI calls. */
import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { admin } from "../_shared/ai-gateway.ts";
import { z } from "../_shared/validate.ts";

const Profile = z.object({
  fontSize: z.number().min(12).max(48).optional(),
  contrast: z.string().max(40).optional(),
  letterSpacing: z.number().min(0).max(1).optional(),
  lineHeight: z.number().min(1).max(3).optional(),
  preferredModality: z.enum(["visual", "audio", "mixed"]).optional(),
  language: z.enum(["es", "en"]).optional(),
}).strict();
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("get") }),
  z.object({ action: z.literal("update"), profile: Profile }),
]);

Deno.serve(aiEndpoint(Body, async ({ data, userId, cors }) => {
  const { data: row, error } = await admin().from("profiles").select("visual_preferences,current_theme").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  const current = (row?.visual_preferences ?? {}) as Record<string, unknown>;
  if (data.action === "get") return jsonRes(cors, { success: true, profile: current, theme: row?.current_theme ?? null });
  if (!row) return jsonRes(cors, { success: false, error: "Profile not found" }, 404);
  const merged = { ...current, ...data.profile };
  const { error: upErr } = await admin().from("profiles").update({ visual_preferences: merged, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (upErr) throw upErr;
  return jsonRes(cors, { success: true, profile: merged });
}));
