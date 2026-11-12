/**
 * EduAccess - Auth Token Management Edge Function
 * Handles user registration with auto-generated tokens and token reset.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateToken(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 90000000 + 10000000).toString();
}

function generateRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

async function hashCode(code: string): Promise<string> {
  const norm = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email: rawEmail, role, recoveryCode } = await req.json();
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email || !action) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (action === "register") {
      const token = generateToken();

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: token,
        email_confirm: true,
      });

      if (error) {
        // Handle duplicate email
        if (error.message?.includes("already been registered") || error.message?.includes("already exists")) {
          return new Response(
            JSON.stringify({ error: "Este correo ya está registrado. Usa 'Olvidé mi token' para obtener uno nuevo." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      // Assign the role chosen at sign-up (teacher | student)
      const chosenRole = role === "teacher" ? "teacher" : "student";
      if (data?.user?.id) {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: data.user.id, role: chosenRole });
        if (roleError) console.error("Role assignment error:", roleError.message);
      }

      const newRecovery = generateRecoveryCode();
      if (data?.user?.id) {
        await supabaseAdmin.from("account_recovery").upsert({
          user_id: data.user.id, code_hash: await hashCode(newRecovery), updated_at: new Date().toISOString(),
        });
      }
      console.log("User registered with role", chosenRole);

      return new Response(
        JSON.stringify({ success: true, token, recoveryCode: newRecovery }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset-token") {
      const invalid = () => new Response(
        JSON.stringify({ error: "Correo o código de recuperación incorrecto." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      if (typeof recoveryCode !== "string" || !recoveryCode.trim()) return invalid();
      // Find user by listing (works for small user bases)
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) throw listError;

      const user = users?.find((u: any) => (u.email || "").toLowerCase() === email);
      if (!user) return invalid();

      const { data: rec } = await supabaseAdmin
        .from("account_recovery").select("code_hash").eq("user_id", user.id).maybeSingle();
      if (!rec || rec.code_hash !== await hashCode(recoveryCode)) return invalid();

      const token = generateToken();

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: token,
      });

      if (updateError) throw updateError;

      const newRecovery = generateRecoveryCode();
      await supabaseAdmin.from("account_recovery").upsert({
        user_id: user.id, code_hash: await hashCode(newRecovery), updated_at: new Date().toISOString(),
      });
      console.log("Token reset completed");

      return new Response(
        JSON.stringify({ success: true, token, recoveryCode: newRecovery }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acción no válida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auth token error:", error);
    const msg = "Error del servidor";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
