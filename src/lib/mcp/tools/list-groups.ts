import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_groups",
  title: "List my groups",
  description: "List the course groups the signed-in user teaches or is enrolled in.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, description, level, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const uid = ctx.getUserId();
    const groups = (data ?? []).map((g) => ({
      id: String(g.id), name: String(g.name ?? ""), description: String(g.description ?? ""),
      level: String(g.level ?? ""), role: g.owner_id === uid ? "teacher" : "student",
    }));
    return { content: [{ type: "text", text: JSON.stringify(groups) }], structuredContent: { groups } };
  },
});
