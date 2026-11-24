import { z } from "npm:zod@3.23.8";
export { z };
export const MAX_BODY_BYTES = 2_000_000;

/** Reads + validates a JSON body; returns data or a 400/413 Response. */
export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T, cors: Record<string, string>, maxBytes = MAX_BODY_BYTES): Promise<{ data: z.infer<T> } | { error: Response }> {
  const json = (status: number, body: unknown) => ({ error: new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } }) });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return json(413, { success: false, error: "Payload too large" });
  const text = await req.text();
  if (text.length > maxBytes) return json(413, { success: false, error: "Payload too large" });
  let raw: unknown;
  try { raw = JSON.parse(text || "{}"); } catch { return json(400, { success: false, error: "Invalid JSON" }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return json(400, { success: false, error: parsed.error.flatten().fieldErrors });
  return { data: parsed.data };
}
