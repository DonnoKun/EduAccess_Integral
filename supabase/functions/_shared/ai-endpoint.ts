/** Common entry for AI endpoints: CORS, auth, rate limit, zod validation. */
import { corsFor, isAllowedOrigin } from "./cors.ts";
import { getUserOr401 } from "./require-user.ts";
import { checkRateLimit } from "./ai-gateway.ts";
import { parseBody, z } from "./validate.ts";

export const jsonRes = (cors: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export function aiEndpoint<T extends z.ZodTypeAny>(schema: T, handler: (ctx: { data: z.infer<T>; userId: string; cors: Record<string, string>; req: Request }) => Promise<Response>, opts: { maxBytes?: number } = {}) {
  return async (req: Request) => {
    const cors = corsFor(req);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!isAllowedOrigin(req)) return jsonRes(cors, { success: false, error: "Origin not allowed" }, 403);
    if (req.method !== "POST") return jsonRes(cors, { success: false, error: "Method not allowed" }, 405);
    const u = await getUserOr401(req, cors);
    if ("error" in u) return u.error;
    if (!(await checkRateLimit(u.userId))) return jsonRes(cors, { success: false, error: "Rate limit exceeded. Please try again in a minute." }, 429);
    const p = await parseBody(req, schema, cors, opts.maxBytes);
    if ("error" in p) return p.error;
    try {
      return await handler({ data: p.data, userId: u.userId, cors, req });
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 402) return jsonRes(cors, { success: false, error: "AI credits exhausted." }, 402);
      console.error("AI endpoint error:", e);
      return jsonRes(cors, { success: false, error: "Server error" }, 500);
    }
  };
}
