import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_group_lessons",
  title: "List group lessons",
  description: "List the lessons in one of the signed-in user's groups (students see only published lessons).",
  inputSchema: { group_id: z.string().uuid().describe("Group id from list_my_groups.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ group_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("group_lessons")
      .select("id, title, status, created_at")
      .eq("group_id", group_id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const lessons = (data ?? []).map((l) => ({ id: String(l.id), title: String(l.title ?? ""), status: String(l.status ?? "") }));
    return { content: [{ type: "text", text: JSON.stringify(lessons) }], structuredContent: { lessons } };
  },
});
