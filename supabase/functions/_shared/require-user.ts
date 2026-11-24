import { createClient } from "npm:@supabase/supabase-js@2.45.0";

/** Returns a 401 Response when the caller is not a signed-in user, otherwise null. */
export async function requireUser(req: Request, corsHeaders: Record<string, string>): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const unauthorized = () =>
    new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (!token) return unauthorized();
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return unauthorized();
  return null;
}

/** Returns the signed-in user's id, or a 401 Response. */
export async function getUserOr401(req: Request, corsHeaders: Record<string, string>): Promise<{ userId: string } | { error: Response }> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const fail = { error: new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  if (!token) return fail;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return fail;
  return { userId: data.user.id };
}
